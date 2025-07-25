import { NextFunction, Request, Response } from 'express';
import { IAccountService } from '../services/interfaces/IAccountService';
import { ApiResponse } from '../dto';
import { IAccountDto, ICreateAccountDto } from '../dto/accountDtos';
import { ApiError } from '../dto/ApiError';

export class AccountController {
  private accountService: IAccountService;

  constructor(accountService: IAccountService) {
    this.accountService = accountService;
  }

  async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userDto: ICreateAccountDto = req.body;
      const user = await this.accountService.createUser(userDto);

      const response: ApiResponse<{ email: string }, null> = {
        status: 'success',
        message: 'User created successfully! Please check your email for verification.',
        data: {
          email: user.email,
        },
      };

      res.status(201).json(response);
    } catch (error: any) {
      next(error);
    }
  }

  async signIn(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { email, password } = req.body;
    if (!email || !password) {
      next(new ApiError('Email and password are required', 401));
      return;
    }
    const user = await this.accountService.signIn(email, password);

    if (!user) {
      const response: ApiResponse<null, { message: string }[]> = {
        status: 'fail',
        message: 'Sign in failed.',
        errors: [
          {
            message: 'Invalid email or password. Please try again.',
          },
        ],
      };

      res.status(401).json(response);
      return;
    }

    if (!user.isActive) {
      const response: ApiResponse<null, { message: string }[]> = {
        status: 'fail',
        message: 'Sign in failed.',
        errors: [
          {
            message: 'User account is not active. Please contact support.',
          },
        ],
      };

      res.status(403).json(response);
      return;
    }

    // User should have verified their email before signing in
    if (!user.emailVerification.verified) {
      const response: ApiResponse<null, { message: string }[]> = {
        status: 'fail',
        message: 'Email not verified. Please verify your email before signing in.',
      };
      res.status(401).json(response);
      return;
    }

    const token: string = await user.generateJwt();

    const userDto: IAccountDto = {
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        token: token,
      },
    };

    const response: ApiResponse<IAccountDto, null> = {
      status: 'success',
      message: 'User signed in successfully',
      data: userDto,
    };
    res.status(200).json(response);
  }

  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, code } = req.body;
      if (!email || !code) {
        const response: ApiResponse<null, { message: string }[]> = {
          status: 'fail',
          message: 'Email and verification code are required.',
          errors: [{ message: 'Email and verification code are required.' }],
        };
        res.status(400).json(response);
        return;
      }
      const success = await this.accountService.verifyEmail(email, Number(code));
      if (!success) {
        const response: ApiResponse<null, { message: string }[]> = {
          status: 'fail',
          message: 'Invalid email or verification code.',
          errors: [{ message: 'Invalid email or verification code.' }],
        };
        res.status(400).json(response);
        return;
      }
      const response: ApiResponse<string, null> = {
        status: 'success',
        message: 'Email verified successfully',
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      if (!email) {
        const response: ApiResponse<null, { message: string }[]> = {
          status: 'fail',
          message: 'Email is required.',
        };
        res.status(400).json(response);
        return;
      }
      await this.accountService.forgotPassword(email);
      const response: ApiResponse<string, null> = {
        status: 'success',
        message: 'An email with a password reset code has been sent.',
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}
