import { IAccountService } from './../interfaces/IAccountService';
import { IAccountDocument } from '../../models/account/account.types';
import { IAccountRepository } from '../../repository/IAccountRepository';
import { ICreateAccountDto } from '../../dto/accountDtos';
import { IEmailService } from '../interfaces/IEmailService';
import { ApiError } from '../../dto/ApiError';
import { hashDigitCode } from '../../utils/generateCode';

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
    const code = user.generateEmailVerificationCode();
    await user.save();

    // Send Verification Email
    await this.emailService.sendVerificationEmail(user.email, code);

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
    const passedHash = hashDigitCode(code);
    // find user by email
    const user = await this.accountRepository.findByEmail(email);
    if (!user) {
      throw new ApiError('User not found', 404);
    }
    // compare the passed hash with the user's hash
    if (user.emailVerification.code === passedHash && !user.emailVerification.verified) {
      user.emailVerification.verified = true;
      await user.save();
      return true;
    }
    throw new ApiError('Invalid code or already verified', 400);
  }
}
