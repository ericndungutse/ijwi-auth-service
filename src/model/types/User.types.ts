import { Document, ObjectId } from 'mongoose';

export interface IUserDto {
  userName: string;
  email: string;
  role: 'admin' | 'user';
  isActive: boolean;
  createdAt: Date;
}

export interface IUserDocument extends Document {
  id: ObjectId;
  email: string;
  password: string;
  role: 'admin' | 'user';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// For updating users (partial)
// export type IUserUpdateDto = Partial<IUserCreateDto>;
