import { ApiResponse } from './../dto/ApiResponse';
import { IAccountCreateResponseDto } from '../models';
import { IAccountService } from '../services/interfaces/IAccountService';
import { NextFunction, Request, response, Response } from 'express';

export class AccountController {
  private accountService: IAccountService;

  constructor(accountService: IAccountService) {
    this.accountService = accountService;
  }

  async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userDto: IAccountCreateResponseDto = req.body;
    await this.accountService.createUser(userDto);

    const response: ApiResponse<void> = {
      status: 'success',
      message: 'User created successfully',
    };

    res.status(201).json(response);
  }
}
