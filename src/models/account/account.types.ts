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
    code: number | null;
    verified: boolean;
  };
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateJwt(): string;
}
