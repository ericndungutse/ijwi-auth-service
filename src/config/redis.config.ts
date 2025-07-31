import { createClient, RedisClientType } from 'redis';

export interface RedisConfig {
  username: string | undefined;
  password: string | undefined;
  host: string | undefined;
  port: number | undefined;
}

export const getRedisConfig = (): RedisConfig => {
  const port: number = parseInt(process.env.REDIS_PORT || '0');
  if (isNaN(port) || port === 0) {
    throw new Error('REDIS_PORT is not a number or is 0');
  }
  return {
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    host: process.env.REDIS_HOST,
    port: port,
  };
};

export const createRedisClient = (): RedisClientType => {
  const config = getRedisConfig();

  const client = createClient({
    username: config.username,
    password: config.password,
    socket: {
      host: config.host,
      port: config.port,
    },
  });

  client.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });

  client.on('connect', () => {
    console.log('Redis Client Connected');
  });

  client.on('ready', () => {
    console.log('Redis Client Ready');
  });

  return client as RedisClientType;
};
