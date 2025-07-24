import { IAccountService } from './../interfaces/IAccountService';
import { IAccountDocument } from '../../models/account/account.types';
import { IAccountRepository } from '../../repository/IAccountRepository';
import { ICreateAccountDto } from '../../dto/accountDtos';
import { IEmailService } from '../interfaces/IEmailService';
import { ApiError } from '../../dto/ApiError';

export class AccountService implements IAccountService {
  private accountRepository: IAccountRepository;
  private emailService: IEmailService;

  constructor(accountRepository: IAccountRepository, emailService: IEmailService) {
    this.accountRepository = accountRepository;
    this.emailService = emailService;
  }

  async createUser(userDto: ICreateAccountDto): Promise<IAccountDocument> {
    if (!userDto.email || !userDto.password) {
      throw new ApiError('Email and password are required', 400);
    }
    const user: IAccountDocument = await this.accountRepository.createAccount(userDto);

    // Send Verification Email
    const verificationCode: number | null = this.accountRepository.getVerificationCode(user);
    await this.emailService.sendVerificationEmail(user.email, verificationCode);

    return user;
  }

  async signIn(email: string, password: string): Promise<IAccountDocument | null> {
    const user = await this.accountRepository.findByEmail(email);
    if (user && (await user.comparePassword(password))) {
      return user;
    }
    return null;
  }

  async verifyEmail(email: string, code: number): Promise<boolean> {
    return this.accountRepository.verifyEmail(email, code);
  }
}
