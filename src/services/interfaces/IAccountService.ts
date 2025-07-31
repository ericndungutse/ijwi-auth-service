import { ICreateAccountDto } from '../../dto/accountDtos';
import { IAccountDocument } from '../../models/account/account.types';

export interface IAccountService {
  createUser(userDto: ICreateAccountDto): Promise<IAccountDocument>;
  signIn(email: string, password: string, device?: string): Promise<IAccountDocument | null>;
  verifyEmail(email: string, code: number): Promise<boolean>;
  forgotPassword(email: string): Promise<void>;
  resetPassword(email: string, resetCode: number, newPassword: string, confirmPassword: string): Promise<void>;
  getCurrentUser(userId: string): Promise<IAccountDocument | null>;
  updatePassword(userId: string, currentPassword: string, newPassword: string, confirmPassword: string): Promise<void>;
  deleteAccount(userId: string): Promise<void>;
}
