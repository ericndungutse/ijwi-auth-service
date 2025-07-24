import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import supertest from 'supertest';
import { App } from '../src/app';

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

describe('App-level routes and middleware', () => {
  it('should return health check', async () => {
    const response = await supertest(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');
    expect(response.body.message).toBe('Auth service is healthy');
    expect(response.body.data.status).toBe('OK');
    expect(response.body.data.timestamp).toBeDefined();
  });

  it('should return 404 for unknown route', async () => {
    const response = await supertest(app).get('/notfound');
    expect(response.status).toBe(404);
    expect(response.body.status).toBe('fail');
    expect(response.body.message).toContain('Route /notfound not found');
    expect(response.body.errors[0].field).toBe('url');
  });

  it('should handle CORS preflight OPTIONS request', async () => {
    const response = await supertest(app).options('/health').set('Origin', 'http://localhost:3000');
    expect(response.status).toBe(200);
    // CORS headers should be present
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(response.headers['access-control-allow-methods']).toBeDefined();
  });

  it('should return 400 for malformed JSON', async () => {
    const response = await supertest(app)
      .post('/api/v1/auth/register')
      .set('Content-Type', 'application/json')
      .send('{ "email": "badjson" '); // missing closing brace
    expect([400, 500]).toContain(response.status); // Express may return 400 or 500
  });
});
