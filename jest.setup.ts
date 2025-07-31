import { beforeAll, afterAll } from '@jest/globals';
import { createRedisClient } from './src/config/redis.config';

// Suppress dotenv console messages during tests
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.log = (...args: any[]) => {
    if (typeof args[0] === 'string' && args[0].includes('[dotenv@')) {
      return; // Suppress dotenv messages
    }
    originalConsoleLog(...args);
  };

  console.warn = (...args: any[]) => {
    if (typeof args[0] === 'string' && args[0].includes('[dotenv@')) {
      return; // Suppress dotenv messages
    }
    originalConsoleWarn(...args);
  };
});

afterAll(async () => {
  // Restore console functions
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;

  // Clear Redis after all tests
  try {
    const redisClient = createRedisClient();

    // Connect to Redis
    await redisClient.connect();

    // Flush all data
    await redisClient.flushAll();

    // Disconnect
    await redisClient.disconnect();

    console.log('Redis cleared after tests');
  } catch (error) {
    // Ignore Redis errors - it might not be running or configured
    console.log('Redis cleanup skipped (not available)');
  }
});
