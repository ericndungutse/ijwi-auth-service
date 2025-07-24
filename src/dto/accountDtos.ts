import { ObjectId } from 'mongoose';

export interface ICreateAccountDto {
  userName: string;
  email: string;
  password: string;
  confirmPassword: string;
}
export interface IAccountCreateResponseDto {
  id: ObjectId;
  email: string;
  role: 'admin' | 'user';
  password: string;
  isActive: boolean;
  emailVerification: {
    code: number | null;
    verified: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface IAccountSignInDto {
  email: string;
  password: string;
}

export interface IAccountDto {
  user: {
    id: string;
    email: string;
    role: 'admin' | 'user';
    isActive: boolean;
    createdAt: Date;
    token: string; // JWT token
  };
}

// For updating users (partial)
// export type IAccountUpdateDto = Partial<ICreateAccountDto>;
