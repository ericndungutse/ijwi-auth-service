export interface IEmailService {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
  sendVerificationEmail(to: string, verificationCode: number): Promise<void>;
  sendPasswordResetEmail(to: string, resetToken: string): Promise<void>;
}
