import { IAccountService } from './../interfaces/IAccountService';
import { IAccountDocument } from '../../models/account/account.types';
import { IAccountRepository } from '../../repository/IAccountRepository';
import { ICreateAccountDto } from '../../dto/accountDtos';
import { IEmailService } from '../interfaces/IEmailService';

export class AccountService implements IAccountService {
  private accountRepository: IAccountRepository;
  private emailService: IEmailService;

  constructor(accountRepository: IAccountRepository, emailService: IEmailService) {
    this.accountRepository = accountRepository;
    this.emailService = emailService;
  }

  async createUser(userDto: ICreateAccountDto): Promise<IAccountDocument> {
    // Create User
    if (!userDto.email || !userDto.password) {
      throw new Error('Email and password are required');
    }
    const user: IAccountDocument = await this.accountRepository.createAccount(userDto);

    // Send Verification Email
    // 1. Create a verification code
    const verificationCode: number | null = this.accountRepository.getVerificationCode(user);

    // 2. Send the email
    await this.emailService.sendVerificationEmail(user.email, verificationCode);

    return user;
  }
}
