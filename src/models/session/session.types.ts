export interface ISessionData {
  accountId: string;
  jwt: string;
  device: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: Date;
}
