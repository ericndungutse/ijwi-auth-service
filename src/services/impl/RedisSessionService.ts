import { ISessionService } from '../interfaces/ISessionService';
import { ISessionData } from '../../models/session/session.types';
import { createRedisClient } from '../../config/redis.config';
import { RedisClientType } from 'redis';

export class RedisSessionService implements ISessionService {
  private client: RedisClientType;
  private isConnected: boolean = false;

  constructor() {
    this.client = createRedisClient();
    this.connect();
  }

  private async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.isConnected = true;
      console.log('Redis Session Service: Connected to Redis');
    } catch (error) {
      console.error('Redis Session Service: Failed to connect to Redis:', error);
      this.isConnected = false;
    }
  }

  private async ensureConnection(): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }
  }

  async addSession(
    accountId: string,
    jwt: string,
    device: string,
    email: string,
    role: 'admin' | 'user',
    createdAt: Date
  ): Promise<void> {
    try {
      await this.ensureConnection();

      const sessionKey = `sessions:${accountId}`;

      const newSession: ISessionData = {
        accountId,
        jwt,
        device,
        email,
        role,
        createdAt,
      };

      // Retrieve existing sessions
      const existing = await this.client.get(sessionKey);
      let sessionList: ISessionData[] = [];

      if (existing) {
        try {
          sessionList = JSON.parse(existing);

          // Ensure it's actually an array
          if (!Array.isArray(sessionList)) {
            sessionList = [sessionList];
          }
        } catch (parseError) {
          console.warn('Failed to parse existing sessions. Resetting session list.');
          sessionList = [];
        }

        // Remove session for same device (optional logic to prevent duplicates)
        sessionList = sessionList.filter((session) => session.device !== device);
      }

      // Add new session
      sessionList.push(newSession);

      // Store updated session list back to Redis
      await this.client.set(sessionKey, JSON.stringify(sessionList));

      console.log('Redis Session Service: Session added successfully', {
        accountId,
        device,
        email,
        role,
        createdAt,
      });
    } catch (error) {
      console.error('Redis Session Service: Failed to add session:', error);
      throw new Error('Failed to add session to Redis');
    }
  }
}
