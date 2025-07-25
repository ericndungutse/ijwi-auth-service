import { Document, ObjectId } from 'mongoose';

export interface IAccountDocument extends Document {
  _id: ObjectId;
  email: string;
  password: string;
  role: 'admin' | 'user';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  emailVerification: {
    code: string | null;
    verified: boolean;
  };
  passwordResetCode: string | null;
  passwordResetCodeExpires: Date | null;
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateJwt(): string;
  generateEmailVerificationCode(): number;
}
