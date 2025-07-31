import { ISessionData } from '../../models/session/session.types';

export interface ISessionService {
  addSession(accountId: string, jwt: string, device: string, email: string, role: 'admin' | 'user', createdAt: Date): Promise<void>;
}
