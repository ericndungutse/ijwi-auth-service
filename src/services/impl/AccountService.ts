import { IAccountService } from './../interfaces/IAccountService';
import { IAccountDocument } from '../../models/account/account.types';
import { IAccountRepository } from '../../repository/IAccountRepository';
import { ICreateAccountDto } from '../../dto/accountDtos';
import { IEmailService } from '../interfaces/IEmailService';
import { ApiError } from '../../dto/ApiError';
import { hashDigitCode, generateSixDigitCode } from '../../utils/generateCode';

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

  async forgotPassword(email: string): Promise<void> {
    const user = await this.accountRepository.findByEmail(email);
    if (!user) {
      throw new ApiError('User not found', 404);
    }
    const code = generateSixDigitCode();
    user.passwordResetCode = hashDigitCode(code);
    user.passwordResetCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
    await user.save();
    await this.emailService.sendPasswordResetEmail(user.email, String(code));
  }

  async resetPassword(email: string, resetCode: number, newPassword: string, confirmPassword: string): Promise<void> {
    // Validate required fields
    if (!email || !resetCode || !newPassword || !confirmPassword) {
      throw new ApiError('Email, reset code, new password, and confirm password are required.', 400);
    }

    // Validate password match
    if (newPassword !== confirmPassword) {
      throw new ApiError('New password and confirm password must match.', 400);
    }

    const user = await this.accountRepository.findByEmail(email);
    if (!user) {
      throw new ApiError('User not found', 404);
    }

    // Check if reset code exists and is not expired
    if (!user.passwordResetCode || !user.passwordResetCodeExpires) {
      throw new ApiError('No password reset code found. Please request a new one.', 400);
    }

    if (new Date() > user.passwordResetCodeExpires) {
      throw new ApiError('Password reset code has expired. Please request a new one.', 400);
    }

    // Verify the reset code
    const passedHash = hashDigitCode(resetCode);
    if (user.passwordResetCode !== passedHash) {
      throw new ApiError('Invalid reset code. Please check your code and try again.', 400);
    }

    // Update password and clear reset code
    user.password = newPassword;
    user.passwordResetCode = null;
    user.passwordResetCodeExpires = null;
    await user.save();
  }

  async getCurrentUser(userId: string): Promise<IAccountDocument | null> {
    const user = await this.accountRepository.findById(userId);
    return user;
  }
}
