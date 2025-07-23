import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { IAccountDocument } from '../account/account.types';

const userSchema = new mongoose.Schema<IAccountDocument>(
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
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Hash password before saving
userSchema.pre<IAccountDocument>('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Create emailVerification code on pre save for new users
userSchema.pre<IAccountDocument>('save', function (next) {
  if (this.isNew) {
    this.emailVerification.code = Math.floor(100000 + Math.random() * 900000); // Generate a 6-digit code
  }
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model<IAccountDocument>('User', userSchema);

export default User;
