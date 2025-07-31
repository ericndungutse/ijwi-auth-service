import { ISessionService } from '../interfaces/ISessionService';

export class RedisSessionService implements ISessionService {
  async addSession(
    accountId: string,
    jwt: string,
    device: string,
    email: string,
    role: 'admin' | 'user',
    createdAt: Date
  ): Promise<void> {
    console.log('Session Service: Adding session to Redis', {
      accountId,
      jwt,
      device,
      email,
      role,
      createdAt,
    });
  }
}
