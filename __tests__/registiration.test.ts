import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
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
