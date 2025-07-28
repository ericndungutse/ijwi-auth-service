import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import supertest from 'supertest';
import { App } from '../src/app';

// ✅ Mock EmailService correctly
jest.mock('./../src/services/impl/EmailService', () => {
  return {
    EmailService: jest.fn().mockImplementation(() => ({
      sendEmail: jest.fn().mockResolvedValue(true),
      sendVerificationEmail: jest.fn().mockResolvedValue(true),
      sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
    })),
  };
});

let mongoServer: MongoMemoryServer;
let app = new App().getApp();

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri('test');
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Registration', () => {
  // Should register a user with valid data
  it('should register a user', async () => {
    const user = { email: 'eric.tuyizere.ndungutse@gmail.com', password: 'password123' };
    const response = await supertest(app).post('/api/v1/auth/register').send(user);
    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      status: 'success',
      message: 'User created successfully! Please check your email for verification.',
      data: { email: user.email },
    });
  });

  it('should fail if email is missing', async () => {
    const user = { password: 'password123' };
    const response = await supertest(app).post('/api/v1/auth/register').send(user);
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      status: 'fail',
      message: 'Email and password are required',
    });
  });

  it('should fail if password is missing', async () => {
    const user = { email: 'missingpass@example.com' };
    const response = await supertest(app).post('/api/v1/auth/register').send(user);
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      status: 'fail',
      message: 'Email and password are required',
    });
  });

  it('should fail if email already exists', async () => {
    const user = { email: 'duplicate@example.com', password: 'password123' };
    // First registration should succeed
    await supertest(app).post('/api/v1/auth/register').send(user);
    // Second registration should fail
    const response = await supertest(app).post('/api/v1/auth/register').send(user);
    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      status: 'fail',
      message: 'Registration failed',
      errors: [{ message: 'Email already exists' }],
    });
  });

  it('should ignore extra fields and register user', async () => {
    const user = { email: 'extrafields@example.com', password: 'password123', extra: 'field' };
    const response = await supertest(app).post('/api/v1/auth/register').send(user);
    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      status: 'success',
      message: 'User created successfully! Please check your email for verification.',
      data: { email: user.email },
    });
  });
});

describe('Signin', () => {
  const baseUser = { email: 'signinuser@example.com', password: 'password123' };

  beforeEach(async () => {
    // Register a user for signin tests
    await supertest(app).post('/api/v1/auth/register').send(baseUser);
    // Verify email manually in DB for success test
    const user = await mongoose.connection.collection('accounts').findOne({ email: baseUser.email });
    if (!user) throw new Error('Test setup failed: user not found');
    await mongoose.connection
      .collection('accounts')
      .updateOne({ _id: user._id }, { $set: { 'emailVerification.verified': true } });
  });

  it('should sign in successfully with correct credentials and verified email', async () => {
    const response = await supertest(app).post('/api/v1/auth/signin').send(baseUser);
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');
    expect(response.body.message).toBe('User signed in successfully');
    expect(response.body.data.user).toMatchObject({
      email: baseUser.email,
      role: 'user',
      isActive: true,
    });
    // For default behavior (no client type), token should be in cookie, not response body
    expect(response.body.data.user.token).toBeUndefined();
    expect(response.headers['set-cookie']).toBeDefined();
    expect(response.headers['set-cookie']).toHaveLength(1);
    expect(response.headers['set-cookie'][0]).toMatch(/jwt=/);
  });

  it('should sign in successfully for mobile client and return token in response', async () => {
    const response = await supertest(app).post('/api/v1/auth/signin').set('x-client-type', 'mobile').send(baseUser);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');
    expect(response.body.message).toBe('User signed in successfully');
    expect(response.body.data.user).toMatchObject({
      email: baseUser.email,
      role: 'user',
      isActive: true,
    });
    expect(response.body.data.user.token).toBeDefined();
    expect(response.body.data.user.token).toBeTruthy();
  });

  it('should sign in successfully for web client and set token in cookie', async () => {
    const response = await supertest(app).post('/api/v1/auth/signin').set('x-client-type', 'web').send(baseUser);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');
    expect(response.body.message).toBe('User signed in successfully');
    expect(response.body.data.user).toMatchObject({
      email: baseUser.email,
      role: 'user',
      isActive: true,
    });
    // For web clients, token should not be in response body
    expect(response.body.data.user.token).toBeUndefined();
    // Check that cookie is set
    expect(response.headers['set-cookie']).toBeDefined();
    expect(response.headers['set-cookie']).toHaveLength(1);
    expect(response.headers['set-cookie'][0]).toMatch(/jwt=/);
  });

  it('should sign in successfully for undefined client type and set token in cookie (default web behavior)', async () => {
    const response = await supertest(app).post('/api/v1/auth/signin').send(baseUser);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');
    expect(response.body.message).toBe('User signed in successfully');
    expect(response.body.data.user).toMatchObject({
      email: baseUser.email,
      role: 'user',
      isActive: true,
    });
    // For undefined client type, token should not be in response body
    expect(response.body.data.user.token).toBeUndefined();
    // Check that cookie is set
    expect(response.headers['set-cookie']).toBeDefined();
    expect(response.headers['set-cookie']).toHaveLength(1);
    expect(response.headers['set-cookie'][0]).toMatch(/jwt=/);
  });

  it('should return 400 for invalid client type', async () => {
    const response = await supertest(app).post('/api/v1/auth/signin').set('x-client-type', 'invalid').send(baseUser);

    expect(response.status).toBe(400);
    expect(response.body.status).toBe('fail');
    expect(response.body.message).toBe('Invalid client type. Must be "mobile" or "web"');
  });

  it('should fail with invalid email', async () => {
    const response = await supertest(app)
      .post('/api/v1/auth/signin')
      .send({ email: 'notfound@example.com', password: 'password123' });
    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      status: 'fail',
      message: 'Sign in failed.',
      errors: [{ message: 'Invalid email or password. Please try again.' }],
    });
  });

  it('should fail with invalid password', async () => {
    const response = await supertest(app)
      .post('/api/v1/auth/signin')
      .send({ email: baseUser.email, password: 'wrongpassword' });
    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      status: 'fail',
      message: 'Sign in failed.',
      errors: [{ message: 'Invalid email or password. Please try again.' }],
    });
  });

  it('should fail if user is inactive', async () => {
    // Set user inactive
    const user = await mongoose.connection.collection('accounts').findOne({ email: baseUser.email });
    if (!user) throw new Error('Test setup failed: user not found');
    await mongoose.connection.collection('accounts').updateOne({ _id: user._id }, { $set: { isActive: false } });
    const response = await supertest(app).post('/api/v1/auth/signin').send(baseUser);
    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      status: 'fail',
      message: 'Sign in failed.',
      errors: [{ message: 'User account is not active. Please contact support.' }],
    });
  });

  it('should fail if email is not verified', async () => {
    // Register a new user (unverified by default)
    const unverified = { email: 'unverified@example.com', password: 'password123' };
    await supertest(app).post('/api/v1/auth/register').send(unverified);
    const response = await supertest(app).post('/api/v1/auth/signin').send(unverified);
    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      status: 'fail',
      message: 'Email not verified. Please verify your email before signing in.',
    });
  });

  it('should fail if email is missing', async () => {
    const response = await supertest(app).post('/api/v1/auth/signin').send({ password: 'password123' });

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      status: 'fail',
      message: 'Email and password are required',
    });
  });

  it('should fail if password is missing', async () => {
    const response = await supertest(app).post('/api/v1/auth/signin').send({ email: baseUser.email });
    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      status: 'fail',
      message: 'Email and password are required',
    });
  });
});

describe('Forgot Password', () => {
  it('should return 200 and generic message for valid email', async () => {
    const user = { email: 'forgot@example.com', password: 'password123' };
    await supertest(app).post('/api/v1/auth/register').send(user);
    // verify email for forgot password to work
    const dbUser = await mongoose.connection.collection('accounts').findOne({ email: user.email });
    if (!dbUser) throw new Error('Test setup failed: user not found');
    await mongoose.connection
      .collection('accounts')
      .updateOne({ _id: dbUser._id }, { $set: { 'emailVerification.verified': true } });
    const response = await supertest(app).post('/api/v1/auth/forgot-password').send({ email: user.email });
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');
    expect(response.body.message).toMatch(
      /password reset code has been sent|email with a password reset code has been sent/i
    );
  });
  it('should return 404 for non-existent email', async () => {
    const response = await supertest(app).post('/api/v1/auth/forgot-password').send({ email: 'notfound@example.com' });
    expect(response.status).toBe(404);
    expect(response.body.status).toBe('fail');
    expect(response.body.message).toMatch(/user not found|email not found/i);
  });
  it('should return 400 if email is missing', async () => {
    const response = await supertest(app).post('/api/v1/auth/forgot-password').send({});
    expect(response.status).toBe(400);
    expect(response.body.status).toBe('fail');
    expect(response.body.message).toMatch(/email is required/i);
  });
});
