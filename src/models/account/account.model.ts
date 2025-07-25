import { IAccountDocument } from './account.types';
const jwt = require('jsonwebtoken');

import mongoose from 'mongoose';
const bcrypt = require('bcrypt');
import { generateSixDigitCode, hashDigitCode } from '../../utils/generateCode';

const accountSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    role: {
      type: String,
      enum: ['admin', 'user'],
      default: 'user',
      required: true,
    },

    emailVerification: {
      code: {
        type: String,
        default: null,
      },
      verified: {
        type: Boolean,
        default: false,
      },
    },
    passwordResetCode: {
      type: String,
      default: null,
    },
    passwordResetCodeExpires: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Hash password before saving
accountSchema.pre('save', async function (this: IAccountDocument, next: any) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err: Error | any) {
    next(err);
  }
});

// Method to compare password
accountSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to generate email verification code
accountSchema.methods.generateEmailVerificationCode = function (): number {
  const code = generateSixDigitCode();
  this.emailVerification.code = hashDigitCode(code);
  return code;
};

// Method to generate jwt
accountSchema.methods.generateJwt = function (): string {
  const payload = {
    id: this._id,
    email: this.email,
    role: this.role,
  };

  const token: string = jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  });

  return token;
};
export const Account = mongoose.model<IAccountDocument>('Account', accountSchema);
