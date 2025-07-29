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

describe('Logout Integration Tests', () => {
  describe('GET /api/v1/auth/logout', () => {
    it('should return 401 for unauthenticated requests', async () => {
      const response = await supertest(server).get('/api/v1/auth/logout').set('x-client-type', 'web');

      expect(response.status).toBe(401);
      expect(response.body.status).toBe('fail');
      expect(response.body.errors[0].message).toContain('No JWT token provided');
    });

    it('should return 401 for invalid JWT token', async () => {
      const response = await supertest(server)
        .get('/api/v1/auth/logout')
        .set('x-client-type', 'web')
        .set('Cookie', 'jwt=invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.status).toBe('fail');
    });

    it('should return 401 for expired JWT token', async () => {
      // Mock an expired token
      const expiredToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY1ZjJhMjEyMzQ1Njc4OTBhYmNkZWYiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJyb2xlIjoidXNlciIsImlhdCI6MTcwMzY5NjAwMCwiZXhwIjoxNzAzNjk2MDAwfQ.invalid';

      const response = await supertest(server)
        .get('/api/v1/auth/logout')
        .set('x-client-type', 'web')
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

      const response = await supertest(server)
        .get('/api/v1/auth/logout')
        .set('x-client-type', 'web')
        .set('Cookie', `jwt=${token}`);

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

      const response = await supertest(server)
        .get('/api/v1/auth/logout')
        .set('x-client-type', 'web')
        .set('Cookie', `jwt=${token}`);

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

      const response = await supertest(server)
        .get('/api/v1/auth/logout')
        .set('x-client-type', 'web')
        .set('Cookie', `jwt=${token}`);

      expect(response.status).toBe(401);
      expect(response.body.status).toBe('fail');
      expect(response.body.errors[0].message).toBe(
        'Email not verified. Please verify your email before accessing protected routes.'
      );
    });

    it('should successfully logout web client and clear JWT cookie', async () => {
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
        .get('/api/v1/auth/logout')
        .set('x-client-type', 'web')
        .set('Cookie', `jwt=${token}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Logged out successfully');
      expect(response.body.data).toBeNull();

      // Check that the JWT cookie is cleared
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();

      if (Array.isArray(cookies)) {
        const jwtCookie = cookies.find((cookie: string) => cookie.startsWith('jwt='));
        expect(jwtCookie).toBeDefined();
        expect(jwtCookie).toContain('Max-Age=0');
        expect(jwtCookie).toContain('HttpOnly');
        expect(jwtCookie).toContain('Secure');
        expect(jwtCookie).toContain('SameSite=None');
      } else if (typeof cookies === 'string') {
        expect(cookies).toContain('jwt=');
        expect(cookies).toContain('Max-Age=0');
        expect(cookies).toContain('HttpOnly');
        expect(cookies).toContain('Secure');
        expect(cookies).toContain('SameSite=None');
      }
    });

    it('should successfully logout with undefined client type (defaults to web)', async () => {
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

      const response = await supertest(server).get('/api/v1/auth/logout').set('Cookie', `jwt=${token}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Logged out successfully');

      // Check that the JWT cookie is cleared
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();

      if (Array.isArray(cookies)) {
        const jwtCookie = cookies.find((cookie: string) => cookie.startsWith('jwt='));
        expect(jwtCookie).toBeDefined();
        expect(jwtCookie).toContain('Max-Age=0');
      } else if (typeof cookies === 'string') {
        expect(cookies).toContain('jwt=');
        expect(cookies).toContain('Max-Age=0');
      }
    });

    it('should return 400 for mobile client type', async () => {
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
        .get('/api/v1/auth/logout')
        .set('x-client-type', 'mobile')
        .set('Cookie', `jwt=${token}`);

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBe('Logout failed. Mobile clients logout is not supported.');
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
        .get('/api/v1/auth/logout')
        .set('x-client-type', 'web')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Logged out successfully');

      // Should still clear the cookie even when using Authorization header
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();

      if (Array.isArray(cookies)) {
        const jwtCookie = cookies.find((cookie: string) => cookie.startsWith('jwt='));
        expect(jwtCookie).toBeDefined();
        expect(jwtCookie).toContain('Max-Age=0');
      } else if (typeof cookies === 'string') {
        expect(cookies).toContain('jwt=');
        expect(cookies).toContain('Max-Age=0');
      }
    });

    it('should handle multiple logout requests for the same user', async () => {
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

      // First logout
      const response1 = await supertest(server)
        .get('/api/v1/auth/logout')
        .set('x-client-type', 'web')
        .set('Cookie', `jwt=${token}`);

      expect(response1.status).toBe(200);
      expect(response1.body.status).toBe('success');

      // Second logout with same token should also succeed (token is still valid, cookie is cleared)
      const response2 = await supertest(server)
        .get('/api/v1/auth/logout')
        .set('x-client-type', 'web')
        .set('Cookie', `jwt=${token}`);

      expect(response2.status).toBe(200);
      expect(response2.body.status).toBe('success');
    });

    it('should handle malformed JWT token', async () => {
      const response = await supertest(server)
        .get('/api/v1/auth/logout')
        .set('x-client-type', 'web')
        .set('Cookie', 'jwt=malformed.jwt.token');

      expect(response.status).toBe(401);
      expect(response.body.status).toBe('fail');
    });

    it('should handle empty JWT token', async () => {
      const response = await supertest(server)
        .get('/api/v1/auth/logout')
        .set('x-client-type', 'web')
        .set('Cookie', 'jwt=');

      expect(response.status).toBe(401);
      expect(response.body.status).toBe('fail');
    });

    it('should handle missing x-client-type header', async () => {
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

      const response = await supertest(server).get('/api/v1/auth/logout').set('Cookie', `jwt=${token}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Logged out successfully');
    });
  });
});
