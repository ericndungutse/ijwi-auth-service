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

  async updatePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<void> {
    // Validate required fields
    if (!currentPassword || !newPassword || !confirmPassword) {
      throw new ApiError('Current password, new password, and confirm password are required.', 400);
    }

    // Validate password match
    if (newPassword !== confirmPassword) {
      throw new ApiError('New password and confirm password must match.', 400);
    }

    // Validate current password is not the same as new password
    if (currentPassword === newPassword) {
      throw new ApiError('New password must be different from current password.', 400);
    }

    // Get user by ID
    const user = await this.accountRepository.findById(userId);
    if (!user) {
      throw new ApiError('User not found', 404);
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      throw new ApiError('Current password is incorrect.', 401);
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Log password change event (you can implement logging here)
    console.log(`Password updated for user: ${user.email} at ${new Date().toISOString()}`);
  }
}
