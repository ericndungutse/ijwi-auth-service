import { NextFunction, Request, Response } from 'express';
import { IAccountService } from '../services/interfaces/IAccountService';
import { ApiResponse } from '../dto';
import { ICreateAccountDto } from '../dto/accountDtos';

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
}
