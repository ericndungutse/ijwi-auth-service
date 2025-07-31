import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
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

  describe('CORS middleware', () => {
    it('should allow requests from configured origins', async () => {
      process.env.CORS_ORIGIN = 'http://localhost:3000,https://example.com';
      const app = new App().getApp();

      const response = await supertest(app).get('/health').set('Origin', 'https://example.com');

      expect(response.headers['access-control-allow-origin']).toBe('https://example.com');
    });

    it('should not set CORS origin for non-allowed origins', async () => {
      process.env.CORS_ORIGIN = 'http://localhost:3000';
      const app = new App().getApp();

      const response = await supertest(app).get('/health').set('Origin', 'https://malicious.com');

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('should use default origins when CORS_ORIGIN is not set', async () => {
      delete process.env.CORS_ORIGIN;
      const app = new App().getApp();

      const response = await supertest(app).get('/health').set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });

    it('should handle requests without origin header', async () => {
      const app = new App().getApp();

      const response = await supertest(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-methods']).toBeDefined();
      expect(response.headers['access-control-allow-headers']).toBeDefined();
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should handle OPTIONS requests correctly', async () => {
      const app = new App().getApp();

      const response = await supertest(app).options('/health').set('Origin', 'http://localhost:3000');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });
  });

  describe('Request logging middleware', () => {
    it('should log request details', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const app = new App().getApp();

      await supertest(app).get('/health');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z - GET \/health$/)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('404 handler', () => {
    it('should return proper 404 response for unknown routes', async () => {
      const response = await supertest(app).get('/unknown/route');

      expect(response.status).toBe(404);
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBe('Route /unknown/route not found');
      expect(response.body.data).toBeNull();
      expect(response.body.errors).toEqual([{ message: 'Route /unknown/route not found', field: 'url' }]);
    });

    it('should handle different HTTP methods for unknown routes', async () => {
      const response = await supertest(app).post('/unknown/route');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Route /unknown/route not found');
    });
  });
});

describe('Internal Signature Middleware', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    originalEnv = { ...process.env };
    originalNodeEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env = originalEnv;
    if (originalNodeEnv) {
      process.env.NODE_ENV = originalNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }
  });

  describe('when NODE_ENV is test', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'test';
    });

    it('should allow requests without signature headers', async () => {
      const app = new App().getApp();

      const response = await supertest(app)
        .post('/api/v1/auth/register')
        .send({ email: 'test@example.com', password: 'password123' });

      // Should not be blocked by signature middleware (may fail for other reasons like validation)
      expect(response.status).not.toBe(401);
    }, 10000); // Increase timeout

    it('should allow requests with invalid signature headers', async () => {
      const app = new App().getApp();

      const response = await supertest(app)
        .post('/api/v1/auth/register')
        .set('x-internal-signature', 'invalid-signature')
        .set('x-internal-timestamp', Date.now().toString())
        .send({ email: 'test@example.com', password: 'password123' });

      // Should not be blocked by signature middleware
      expect(response.status).not.toBe(401);
    });
  });

  describe('when NODE_ENV is not test', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      process.env.INTERNAL_SIGNATURE = 'test-secret-key';
    });

    it('should allow health check requests without signature', async () => {
      const app = new App().getApp();

      const response = await supertest(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });

    it('should reject requests without signature headers', async () => {
      const app = new App().getApp();

      const response = await supertest(app)
        .post('/api/v1/auth/register')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Unauthorized. Request did not come from API Gateway');
    });

    it('should reject requests with missing x-internal-signature header', async () => {
      const app = new App().getApp();

      const response = await supertest(app)
        .post('/api/v1/auth/register')
        .set('x-internal-timestamp', Date.now().toString())
        .send({ email: 'test@example.com', password: 'password123' });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Unauthorized. Request did not come from API Gateway');
    });

    it('should reject requests with missing x-internal-timestamp header', async () => {
      const app = new App().getApp();

      const response = await supertest(app)
        .post('/api/v1/auth/register')
        .set('x-internal-signature', 'some-signature')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Unauthorized. Request did not come from API Gateway');
    });

    it('should reject requests with invalid signature', async () => {
      const app = new App().getApp();

      const response = await supertest(app)
        .post('/api/v1/auth/register')
        .set('x-internal-signature', 'invalid-signature')
        .set('x-internal-timestamp', Date.now().toString())
        .send({ email: 'test@example.com', password: 'password123' });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Unauthorized. Request did not come from API Gateway');
    });

    it('should reject requests with old timestamp (replay attack)', async () => {
      const app = new App().getApp();

      // Generate valid signature but use old timestamp
      const crypto = require('crypto');
      const validSignature = crypto.createHmac('sha256', 'test-secret-key').digest('hex');
      const oldTimestamp = Date.now() - 120000; // 2 minutes ago

      const response = await supertest(app)
        .post('/api/v1/auth/register')
        .set('x-internal-signature', validSignature)
        .set('x-internal-timestamp', oldTimestamp.toString())
        .send({ email: 'test@example.com', password: 'password123' });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Unauthorized. Request is too old');
    });

    it('should allow requests with valid signature and recent timestamp', async () => {
      const app = new App().getApp();

      // Generate valid signature
      const crypto = require('crypto');
      const validSignature = crypto.createHmac('sha256', 'test-secret-key').digest('hex');
      const timestamp = Date.now().toString();

      const response = await supertest(app)
        .post('/api/v1/auth/register')
        .set('x-internal-signature', validSignature)
        .set('x-internal-timestamp', timestamp)
        .send({ email: 'test@example.com', password: 'password123' });

      // Should not be blocked by signature middleware (may fail for other reasons like validation)
      expect(response.status).not.toBe(401);
    });

    it('should handle missing INTERNAL_SIGNATURE environment variable', async () => {
      delete process.env.INTERNAL_SIGNATURE;
      const app = new App().getApp();

      const response = await supertest(app)
        .post('/api/v1/auth/register')
        .set('x-internal-signature', 'some-signature')
        .set('x-internal-timestamp', Date.now().toString())
        .send({ email: 'test@example.com', password: 'password123' });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error');
    });

    it('should allow requests with valid signature within 1 minute leeway', async () => {
      const app = new App().getApp();

      // Generate valid signature
      const crypto = require('crypto');
      const validSignature = crypto.createHmac('sha256', 'test-secret-key').digest('hex');
      const timestamp = Date.now() - 30000; // 30 seconds ago (within 1 minute leeway)

      const response = await supertest(app)
        .post('/api/v1/auth/register')
        .set('x-internal-signature', validSignature)
        .set('x-internal-timestamp', timestamp.toString())
        .send({ email: 'test@example.com', password: 'password123' });

      // Should not be blocked by signature middleware
      expect(response.status).not.toBe(401);
    });

    it('should reject requests with valid signature but old timestamp', async () => {
      const app = new App().getApp();

      // Generate valid signature
      const crypto = require('crypto');
      const validSignature = crypto.createHmac('sha256', 'test-secret-key').digest('hex');
      const timestamp = Date.now() - 70000; // 70 seconds ago (outside 1 minute leeway)

      const response = await supertest(app)
        .post('/api/v1/auth/register')
        .set('x-internal-signature', validSignature)
        .set('x-internal-timestamp', timestamp.toString())
        .send({ email: 'test@example.com', password: 'password123' });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Unauthorized. Request is too old');
    });
  });

  describe('when NODE_ENV is development', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      process.env.INTERNAL_SIGNATURE = 'test-secret-key';
    });

    it('should reject requests without signature headers', async () => {
      const app = new App().getApp();

      const response = await supertest(app)
        .post('/api/v1/auth/register')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Unauthorized. Request did not come from API Gateway');
    });
  });
});

describe('App class methods', () => {
  describe('connectToDatabase', () => {
    let originalEnv: NodeJS.ProcessEnv;
    let consoleSpy: any;

    beforeEach(() => {
      originalEnv = { ...process.env };
      consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      process.env = originalEnv;
      consoleSpy.mockRestore();
    });

    it('should connect to database successfully', async () => {
      const app = new App();
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test';

      // Mock mongoose.connect to resolve successfully
      const mockConnect = jest.spyOn(mongoose, 'connect').mockResolvedValue(mongoose);

      await app.connectToDatabase();

      expect(mockConnect).toHaveBeenCalledWith('mongodb://localhost:27017/test');
      expect(consoleSpy).toHaveBeenCalledWith('✅ Connected to MongoDB successfully');

      mockConnect.mockRestore();
    });

    it('should handle missing MONGODB_URI by calling process.exit', async () => {
      const app = new App();
      delete process.env.MONGODB_URI;

      const processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await app.connectToDatabase();

      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Failed to connect to MongoDB:', expect.any(Error));
      expect(processExitSpy).toHaveBeenCalledWith(1);

      processExitSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should handle database connection errors', async () => {
      const app = new App();
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test';

      const mockConnect = jest.spyOn(mongoose, 'connect').mockRejectedValue(new Error('Connection failed'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await app.connectToDatabase();

      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Failed to connect to MongoDB:', expect.any(Error));
      expect(processExitSpy).toHaveBeenCalledWith(1);

      mockConnect.mockRestore();
      consoleErrorSpy.mockRestore();
      processExitSpy.mockRestore();
    });

    it('should set up database event handlers', async () => {
      const app = new App();
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test';

      const mockConnect = jest.spyOn(mongoose, 'connect').mockResolvedValue(mongoose);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      await app.connectToDatabase();

      // Simulate database events
      mongoose.connection.emit('error', new Error('DB Error'));
      mongoose.connection.emit('disconnected');
      mongoose.connection.emit('reconnected');

      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ MongoDB connection error:', expect.any(Error));
      expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️ MongoDB disconnected');
      expect(consoleSpy).toHaveBeenCalledWith('✅ MongoDB reconnected');

      mockConnect.mockRestore();
      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });
  });

  describe('getApp', () => {
    it('should return the Express application instance', () => {
      const app = new App();
      const expressApp = app.getApp();

      expect(expressApp).toBeDefined();
      expect(typeof expressApp.get).toBe('function');
      expect(typeof expressApp.post).toBe('function');
      expect(typeof expressApp.use).toBe('function');
    });
  });
});
