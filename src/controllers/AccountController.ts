import { Request, Response, NextFunction } from 'express';
import { IAccountService } from '../services/interfaces/IAccountService';
import { ICreateAccountDto, IAccountDto, IResetPasswordDto, ICurrentUserDto } from '../dto/accountDtos';
import { ApiResponse } from '../dto/ApiResponse';
import { ApiError } from '../dto/ApiError';
import { IAccountDocument } from '../models/account/account.types';

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

    // Check for client type header
    const clientType = req.headers['x-client-type'] as 'mobile' | 'web' | undefined;

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

    if (clientType === 'mobile') {
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
      return;
    }

    if (clientType === 'web' || clientType === undefined) {
      // For web clients, set JWT in HttpOnly cookie
      // Calculate maxAge based on JWT_EXPIRES_IN
      let maxAge = 24 * 60 * 60 * 1000; // Default to 24 hours
      if (process.env.JWT_EXPIRES_IN) {
        const expiresIn = process.env.JWT_EXPIRES_IN;
        if (expiresIn.includes('d')) {
          maxAge = Number(expiresIn.replace('d', '')) * 24 * 60 * 60 * 1000;
        } else if (expiresIn.includes('h')) {
          maxAge = Number(expiresIn.replace('h', '')) * 60 * 60 * 1000;
        } else if (expiresIn.includes('m')) {
          maxAge = Number(expiresIn.replace('m', '')) * 60 * 1000;
        } else if (expiresIn.includes('s')) {
          maxAge = Number(expiresIn.replace('s', '')) * 1000;
        }
      }

      res.cookie('jwt', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge,
      });

      const userDto: IAccountDto = {
        user: {
          id: user._id.toString(),
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
        },
      };

      const response: ApiResponse<IAccountDto, null> = {
        status: 'success',
        message: 'User signed in successfully',
        data: userDto,
      };
      res.status(200).json(response);
      return;
    }

    next(new ApiError('Invalid client type. Must be "mobile" or "web"', 400));
    return;
  }

  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, code } = req.body;
      if (!email || !code) {
        next(new ApiError('Email and verification code are required.', 400));
        return;
      }
      const success = await this.accountService.verifyEmail(email, Number(code));
      if (!success) {
        next(new ApiError('Invalid email or verification code.', 400));

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
        next(new ApiError('Email is required.', 400));
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

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, resetCode, newPassword, confirmPassword }: IResetPasswordDto = req.body;

      await this.accountService.resetPassword(email, resetCode, newPassword, confirmPassword);

      const response: ApiResponse<string, null> = {
        status: 'success',
        message: 'Password has been reset successfully.',
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Check for client type header
      const clientType = req.headers['x-client-type'] as 'mobile' | 'web' | undefined;

      // Reject if client type is mobile
      if (clientType === 'mobile') {
        next(new ApiError('Logout failed. Mobile clients logout is not supported.', 400));

        return;
      }

      res.cookie('jwt', '', {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 0, // This immediately expires the cookie
      });

      const response: ApiResponse<null, null> = {
        status: 'success',
        message: 'Logged out successfully',
        data: null,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async getCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // The user is already attached to req.user by the authenticate middleware
      const user = (req as any).user as IAccountDocument | undefined;

      if (!user) {
        next(new ApiError('User not found', 404));

        return;
      }

      const userDto: ICurrentUserDto = {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      };

      const response: ApiResponse<{ user: ICurrentUserDto }, null> = {
        status: 'success',
        message: 'Current user information retrieved successfully',
        data: {
          user: userDto,
        },
      };

      res.status(200).json(response);
    } catch (error: any) {
      next(error);
    }
  }
}
