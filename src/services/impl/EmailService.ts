import { IEmailService } from '../interfaces/IEmailService';

export class EmailService implements IEmailService {
  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    // TODO: Implement actual email sending logic
    console.log(`Sending email to ${to} with subject "${subject}" and body: ${body}`);
  }

  async sendVerificationEmail(to: string, verificationToken: string): Promise<void> {
    // TODO: Implement actual verification email logic
    const subject = 'Verify your email address';
    const body = `Please verify your email using this token: ${verificationToken}`;
    await this.sendEmail(to, subject, body);
  }

  async sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
    // TODO: Implement actual password reset email logic
    const subject = 'Reset your password';
    const body = `Use this token to reset your password: ${resetToken}`;
    await this.sendEmail(to, subject, body);
  }
}
