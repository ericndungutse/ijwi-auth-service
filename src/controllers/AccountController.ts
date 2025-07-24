import { NextFunction, Request, Response } from 'express';
import { IAccountService } from '../services/interfaces/IAccountService';
import { ApiResponse } from '../dto';
import { IAccountDto, ICreateAccountDto } from '../dto/accountDtos';

export class AccountController {
  private accountService: IAccountService;

  constructor(accountService: IAccountService) {
    this.accountService = accountService;
  }

  async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userDto: ICreateAccountDto = req.body;
      await this.accountService.createUser(userDto);

      const response: ApiResponse<string, null> = {
        status: 'success',
        message: 'User created successfully',
      };

      res.status(201).json(response);
    } catch (error) {
      console.error(error);
    }
  }

  async signIn(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { email, password } = req.body;
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
        errors: [
          {
            message: 'Email not verified. Please verify your email before signing in.',
          },
        ],
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
}
