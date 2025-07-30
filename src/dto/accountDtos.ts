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
    token?: string; // JWT token (optional for web clients)
  };
}

// For updating users (partial)
// export type IAccountUpdateDto = Partial<ICreateAccountDto>;

export interface IResetPasswordDto {
  email: string;
  resetCode: number;
  newPassword: string;
  confirmPassword: string;
}

export interface ICurrentUserDto {
  id: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: Date;
}

export interface IUpdatePasswordDto {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
