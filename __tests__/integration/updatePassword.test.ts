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

describe('Update Password Integration Tests', () => {
  let testUser: any;
  let authToken: string;

  beforeEach(async () => {
    // Create a test user
    testUser = new Account({
      email: 'test@example.com',
      password: 'TestPassword123!',
      userName: 'testuser',
      emailVerification: {
        verified: true,
      },
      isActive: true,
      role: 'user',
    });
    await testUser.save();

    // Sign in to get auth token
    const signInResponse = await supertest(server)
      .post('/api/v1/auth/signin')
      .send({
        email: 'test@example.com',
        password: 'TestPassword123!',
      })
      .set('x-client-type', 'mobile');

    authToken = signInResponse.body.data.user.token;
  });

  describe('PATCH /api/account/update-password', () => {
    it('should successfully update password with valid credentials', async () => {
      const response = await supertest(server)
        .patch('/api/v1/auth/update-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'TestPassword123!',
          newPassword: 'NewPassword123!',
          confirmPassword: 'NewPassword123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Password updated successfully');

      // Verify the password was actually changed by trying to sign in with new password
      const signInResponse = await supertest(server)
        .post('/api/v1/auth/signin')
        .send({
          email: 'test@example.com',
          password: 'NewPassword123!',
        })
        .set('x-client-type', 'mobile');

      expect(signInResponse.status).toBe(200);
    });

    it('should fail when current password is incorrect', async () => {
      const response = await supertest(server)
        .patch('/api/v1/auth/update-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'WrongPassword123!',
          newPassword: 'NewPassword123!',
          confirmPassword: 'NewPassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBe('Current password is incorrect.');
    });

    it('should fail when new password and confirm password do not match', async () => {
      const response = await supertest(server)
        .patch('/api/v1/auth/update-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'TestPassword123!',
          newPassword: 'NewPassword123!',
          confirmPassword: 'DifferentPassword123!',
        });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBe('New password and confirm password must match.');
    });

    it('should fail when current password and new password are the same', async () => {
      const response = await supertest(server)
        .patch('/api/v1/auth/update-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'TestPassword123!',
          newPassword: 'TestPassword123!',
          confirmPassword: 'TestPassword123!',
        });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBe('New password must be different from current password.');
    });

    it('should fail when required fields are missing', async () => {
      const response = await supertest(server)
        .patch('/api/v1/auth/update-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'TestPassword123!',
          // missing newPassword and confirmPassword
        });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBe('Current password, new password, and confirm password are required.');
    });

    it('should fail when not authenticated', async () => {
      const response = await supertest(server).patch('/api/v1/auth/update-password').send({
        currentPassword: 'TestPassword123!',
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
      });

      expect(response.status).toBe(401);
      expect(response.body.status).toBe('fail');
    });

    it('should fail with invalid JWT token', async () => {
      const response = await supertest(server)
        .patch('/api/v1/auth/update-password')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          currentPassword: 'TestPassword123!',
          newPassword: 'NewPassword123!',
          confirmPassword: 'NewPassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.status).toBe('fail');
    });

    it('should fail with expired JWT token', async () => {
      // Create an expired token
      const expiredToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY1ZjJhMjEyMzQ1Njc4OTBhYmNkZWYiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJyb2xlIjoidXNlciIsImlhdCI6MTcwMzY5NjAwMCwiZXhwIjoxNzAzNjk2MDAwfQ.invalid';

      const response = await supertest(server)
        .patch('/api/v1/auth/update-password')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({
          currentPassword: 'TestPassword123!',
          newPassword: 'NewPassword123!',
          confirmPassword: 'NewPassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.status).toBe('fail');
    });

    it('should handle empty request body', async () => {
      const response = await supertest(server)
        .patch('/api/v1/auth/update-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('fail');
    });

    it('should handle partial request body', async () => {
      const response = await supertest(server)
        .patch('/api/v1/auth/update-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'TestPassword123!',
          newPassword: 'NewPassword123!',
          // missing confirmPassword
        });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('fail');
    });

    it('should handle empty string values', async () => {
      const response = await supertest(server)
        .patch('/api/v1/auth/update-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('fail');
    });
  });
});
