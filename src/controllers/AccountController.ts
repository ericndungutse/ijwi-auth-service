import { NextFunction, Request, Response } from 'express';
import { IAccountService } from '../services/interfaces/IAccountService';
import { IAccountCreateResponseDto } from '../models/account/account.types';
import { ApiResponse } from '../dto';

class AccountController {
  private accountService: IAccountService;

  constructor(accountService: IAccountService) {
    this.accountService = accountService;
  }

  async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userDto: IAccountCreateResponseDto = req.body;
    await this.accountService.createUser(userDto);

    const response: ApiResponse<string, null> = {
      status: 'success',
      message: 'User created successfully',
    };

    res.status(201).json(response);
  }
}

module.exports = { AccountController };
