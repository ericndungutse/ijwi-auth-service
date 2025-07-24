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
    expect(response.body.data.user.token).toBeDefined();
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
      errors: [{ message: 'Email not verified. Please verify your email before signing in.' }],
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
