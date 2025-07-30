import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import supertest from 'supertest';
import { App } from '../../src/app';
import { Account } from '../../src/models/account/account.model';

// Mock EmailService to avoid sending real emails during tests
jest.mock('../../src/services/impl/EmailService', () => {
  return {
    EmailService: jest.fn().mockImplementation(() => ({
      sendEmail: jest.fn().mockResolvedValue(true),
      sendVerificationEmail: jest.fn().mockResolvedValue(true),
      sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
    })),
  };
});

let mongoServer: MongoMemoryServer;
let app: App;
let server: any;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri('test');
  await mongoose.connect(uri);

  app = new App();
  server = app.getApp();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear all collections before each test
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

describe('Delete Account Integration Tests', () => {
  describe('DELETE /api/v1/auth/delete-account', () => {
    it('should return 401 for unauthenticated requests', async () => {
      const response = await supertest(server).delete('/api/v1/auth/delete-account');

      expect(response.status).toBe(401);
      expect(response.body.status).toBe('fail');
      expect(response.body.errors[0].message).toContain('No JWT token provided');
    });

    it('should return 401 for invalid JWT token', async () => {
      const response = await supertest(server).delete('/api/v1/auth/delete-account').set('Cookie', 'jwt=invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.status).toBe('fail');
    });

    it('should return 401 for expired JWT token', async () => {
      // Mock an expired token
      const expiredToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY1ZjJhMjEyMzQ1Njc4OTBhYmNkZWYiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJyb2xlIjoidXNlciIsImlhdCI6MTcwMzY5NjAwMCwiZXhwIjoxNzAzNjk2MDAwfQ.invalid';

      const response = await supertest(server)
        .delete('/api/v1/auth/delete-account')
        .set('Cookie', `jwt=${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.status).toBe('fail');
    });

    it('should return 401 for non-existent user', async () => {
      // Create a user, generate token, then delete the user
      const user = new Account({
        email: 'test@example.com',
        password: 'password123',
        userName: 'testuser',
        emailVerification: {
          verified: true,
          code: 123456,
        },
        isActive: true,
        role: 'user',
      });
      await user.save();

      const token = await user.generateJwt();
      await Account.findByIdAndDelete(user._id);

      const response = await supertest(server).delete('/api/v1/auth/delete-account').set('Cookie', `jwt=${token}`);

      expect(response.status).toBe(401);
      expect(response.body.status).toBe('fail');
      expect(response.body.errors[0].message).toBe('User no longer exists.');
    });

    it('should return 401 for inactive user', async () => {
      const user = new Account({
        email: 'test@example.com',
        password: 'password123',
        userName: 'testuser',
        emailVerification: {
          verified: true,
          code: 123456,
        },
        isActive: false, // Inactive user
        role: 'user',
      });
      await user.save();

      const token = await user.generateJwt();

      const response = await supertest(server).delete('/api/v1/auth/delete-account').set('Cookie', `jwt=${token}`);

      expect(response.status).toBe(401);
      expect(response.body.status).toBe('fail');
      expect(response.body.errors[0].message).toBe('User account is deactivated.');
    });

    it('should return 401 for unverified email', async () => {
      const user = new Account({
        email: 'test@example.com',
        password: 'password123',
        userName: 'testuser',
        emailVerification: {
          verified: false, // Unverified email
          code: 123456,
        },
        isActive: true,
        role: 'user',
      });
      await user.save();

      const token = await user.generateJwt();

      const response = await supertest(server).delete('/api/v1/auth/delete-account').set('Cookie', `jwt=${token}`);

      expect(response.status).toBe(401);
      expect(response.body.status).toBe('fail');
      expect(response.body.errors[0].message).toBe(
        'Email not verified. Please verify your email before accessing protected routes.'
      );
    });

    it('should successfully delete account and mark as inactive', async () => {
      const user = new Account({
        email: 'test@example.com',
        password: 'password123',
        userName: 'testuser',
        emailVerification: {
          verified: true,
          code: 123456,
        },
        isActive: true,
        role: 'user',
      });
      await user.save();

      const token = await user.generateJwt();

      const response = await supertest(server).delete('/api/v1/auth/delete-account').set('Cookie', `jwt=${token}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Account deleted successfully. Your account has been marked as inactive.');
      expect(response.body.data).toBeNull();

      // Verify the account is marked as inactive in the database
      const updatedUser = await Account.findById(user._id);
      expect(updatedUser).toBeDefined();
      expect(updatedUser!.isActive).toBe(false);
    });

    it('should work with Authorization header instead of cookie', async () => {
      const user = new Account({
        email: 'test@example.com',
        password: 'password123',
        userName: 'testuser',
        emailVerification: {
          verified: true,
          code: 123456,
        },
        isActive: true,
        role: 'user',
      });
      await user.save();

      const token = await user.generateJwt();

      const response = await supertest(server)
        .delete('/api/v1/auth/delete-account')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Account deleted successfully. Your account has been marked as inactive.');

      // Verify the account is marked as inactive in the database
      const updatedUser = await Account.findById(user._id);
      expect(updatedUser).toBeDefined();
      expect(updatedUser!.isActive).toBe(false);
    });

    it('should handle malformed JWT token', async () => {
      const response = await supertest(server)
        .delete('/api/v1/auth/delete-account')
        .set('Cookie', 'jwt=malformed.jwt.token');

      expect(response.status).toBe(401);
      expect(response.body.status).toBe('fail');
    });

    it('should handle empty JWT token', async () => {
      const response = await supertest(server).delete('/api/v1/auth/delete-account').set('Cookie', 'jwt=');

      expect(response.status).toBe(401);
      expect(response.body.status).toBe('fail');
    });

    it('should prevent deletion of already inactive account', async () => {
      const user = new Account({
        email: 'test@example.com',
        password: 'password123',
        userName: 'testuser',
        emailVerification: {
          verified: true,
          code: 123456,
        },
        isActive: false, // Already inactive
        role: 'user',
      });
      await user.save();

      const token = await user.generateJwt();

      const response = await supertest(server).delete('/api/v1/auth/delete-account').set('Cookie', `jwt=${token}`);

      expect(response.status).toBe(401);
      expect(response.body.status).toBe('fail');
      expect(response.body.errors[0].message).toBe('User account is deactivated.');
    });

    it('should handle multiple delete requests for the same user', async () => {
      const user = new Account({
        email: 'test@example.com',
        password: 'password123',
        userName: 'testuser',
        emailVerification: {
          verified: true,
          code: 123456,
        },
        isActive: true,
        role: 'user',
      });
      await user.save();

      const token = await user.generateJwt();

      // First delete request
      const response1 = await supertest(server).delete('/api/v1/auth/delete-account').set('Cookie', `jwt=${token}`);

      expect(response1.status).toBe(200);
      expect(response1.body.status).toBe('success');

      // Second delete request should fail because account is now inactive
      const response2 = await supertest(server).delete('/api/v1/auth/delete-account').set('Cookie', `jwt=${token}`);

      expect(response2.status).toBe(401);
      expect(response2.body.status).toBe('fail');
      expect(response2.body.errors[0].message).toBe('User account is deactivated.');
    });

    it('should work with admin users', async () => {
      const adminUser = new Account({
        email: 'admin@example.com',
        password: 'password123',
        userName: 'adminuser',
        emailVerification: {
          verified: true,
          code: 123456,
        },
        isActive: true,
        role: 'admin',
      });
      await adminUser.save();

      const token = await adminUser.generateJwt();

      const response = await supertest(server).delete('/api/v1/auth/delete-account').set('Cookie', `jwt=${token}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Account deleted successfully. Your account has been marked as inactive.');

      // Verify the admin account is marked as inactive in the database
      const updatedUser = await Account.findById(adminUser._id);
      expect(updatedUser).toBeDefined();
      expect(updatedUser!.isActive).toBe(false);
    });

    it('should preserve other user data after deletion', async () => {
      const user = new Account({
        email: 'test@example.com',
        password: 'password123',
        userName: 'testuser',
        emailVerification: {
          verified: true,
          code: 123456,
        },
        isActive: true,
        role: 'user',
      });
      await user.save();

      const token = await user.generateJwt();

      const response = await supertest(server).delete('/api/v1/auth/delete-account').set('Cookie', `jwt=${token}`);

      expect(response.status).toBe(200);

      // Verify the account still exists but is inactive
      const updatedUser = await Account.findById(user._id);
      expect(updatedUser).toBeDefined();
      expect(updatedUser!.isActive).toBe(false);
      expect(updatedUser!.email).toBe('test@example.com');
      expect(updatedUser!.role).toBe('user');
      expect(updatedUser!.emailVerification.verified).toBe(true);
    });

    it('should handle database errors gracefully', async () => {
      const user = new Account({
        email: 'test@example.com',
        password: 'password123',
        userName: 'testuser',
        emailVerification: {
          verified: true,
          code: 123456,
        },
        isActive: true,
        role: 'user',
      });
      await user.save();

      const token = await user.generateJwt();

      // Simulate database error by disconnecting
      await mongoose.disconnect();

      const response = await supertest(server).delete('/api/v1/auth/delete-account').set('Cookie', `jwt=${token}`);

      // The authentication middleware will fail first due to database disconnection
      expect(response.status).toBe(401);
      expect(response.body.status).toBe('fail');

      // Reconnect for cleanup
      await mongoose.connect(mongoServer.getUri('test'));
    });
  });
});
