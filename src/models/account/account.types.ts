import { Document, ObjectId } from 'mongoose';

export interface IAccountDocument extends Document {
  id: ObjectId;
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
}

export interface IAccountCreateDto {
  userName: string;
  email: string;
  password: string;
  confirmPassword: string;
}
export interface IAccountCreateResponseDto {
  id: ObjectId;
  email: string;
  role: 'admin' | 'user';
  isActive: boolean;
  emailVerification: {
    code: number | null;
    verified: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

// For updating users (partial)
// export type IAccountUpdateDto = Partial<IAccountCreateDto>;
