import { EmailService } from '../../src/services/impl/EmailService';
import nodemailer from 'nodemailer';

// Mock nodemailer
jest.mock('nodemailer');

describe('EmailService', () => {
  let emailService: EmailService;
  let mockTransporter: any;
  let mockSendMail: jest.Mock;

  beforeEach(() => {
    // Setup environment variables for testing
    process.env.EMAIL_USER = 'test@example.com';
    process.env.EMAIL_PASS = 'testpassword';
    process.env.EMAIL_HOST = 'smtp.test.com';
    process.env.EMAIL_PORT = '587';
    process.env.EMAIL_FROM = 'noreply@test.com';

    // Mock the transporter
    mockSendMail = jest.fn();
    mockTransporter = {
      sendMail: mockSendMail,
    };

    // Mock nodemailer.createTransport
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.EMAIL_USER;
    delete process.env.EMAIL_PASS;
    delete process.env.EMAIL_HOST;
    delete process.env.EMAIL_PORT;
    delete process.env.EMAIL_FROM;
  });

  describe('constructor', () => {
    it('should create EmailService with default configuration', () => {
      expect(() => new EmailService()).not.toThrow();
      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.test.com',
        port: 587,
        secure: false,
        auth: {
          user: 'test@example.com',
          pass: 'testpassword',
        },
        tls: {
          rejectUnauthorized: false,
        },
      });
    });

    it('should create EmailService with custom EMAIL_FROM', () => {
      process.env.EMAIL_FROM = 'custom@test.com';
      expect(() => new EmailService()).not.toThrow();
    });

    it('should use EMAIL_USER as fallback for EMAIL_FROM', () => {
      delete process.env.EMAIL_FROM;
      expect(() => new EmailService()).not.toThrow();
    });

    it('should throw error when EMAIL_USER is missing', () => {
      delete process.env.EMAIL_USER;
      expect(() => new EmailService()).toThrow(
        'Email credentials are missing. Please check EMAIL_USER and EMAIL_PASS environment variables.'
      );
    });

    it('should throw error when EMAIL_PASS is missing', () => {
      delete process.env.EMAIL_PASS;
      expect(() => new EmailService()).toThrow(
        'Email credentials are missing. Please check EMAIL_USER and EMAIL_PASS environment variables.'
      );
    });

    it('should use default host when EMAIL_HOST is not provided', () => {
      delete process.env.EMAIL_HOST;
      expect(() => new EmailService()).not.toThrow();
      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'smtp.gmail.com',
        })
      );
    });

    it('should use default port when EMAIL_PORT is not provided', () => {
      delete process.env.EMAIL_PORT;
      expect(() => new EmailService()).not.toThrow();
      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          port: 587,
        })
      );
    });
  });

  describe('sendEmail', () => {
    beforeEach(() => {
      emailService = new EmailService();
    });

    it('should send email successfully', async () => {
      const mockInfo = { messageId: 'test-message-id' };
      mockSendMail.mockResolvedValue(mockInfo);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await emailService.sendEmail('recipient@example.com', 'Test Subject', '<p>Test body</p>');

      expect(mockSendMail).toHaveBeenCalledWith({
        from: 'noreply@test.com',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test body</p>',
      });
      expect(consoleSpy).toHaveBeenCalledWith('Email sent successfully:', 'test-message-id');
    });

    it('should use EMAIL_USER as fallback for from field when EMAIL_FROM is not set', async () => {
      delete process.env.EMAIL_FROM;
      emailService = new EmailService();

      const mockInfo = { messageId: 'test-message-id' };
      mockSendMail.mockResolvedValue(mockInfo);

      await emailService.sendEmail('recipient@example.com', 'Test Subject', '<p>Test body</p>');

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'test@example.com',
        })
      );
    });

    it('should throw error when email sending fails', async () => {
      const error = new Error('SMTP connection failed');
      mockSendMail.mockRejectedValue(error);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(emailService.sendEmail('recipient@example.com', 'Test Subject', '<p>Test body</p>')).rejects.toThrow(
        'Failed to send email'
      );

      expect(consoleSpy).toHaveBeenCalledWith('Error sending email:', error);
    });

    it('should handle empty body', async () => {
      const mockInfo = { messageId: 'test-message-id' };
      mockSendMail.mockResolvedValue(mockInfo);

      await emailService.sendEmail('recipient@example.com', 'Test Subject', '');

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: '',
        })
      );
    });

    it('should handle special characters in subject and body', async () => {
      const mockInfo = { messageId: 'test-message-id' };
      mockSendMail.mockResolvedValue(mockInfo);

      await emailService.sendEmail(
        'recipient@example.com',
        'Test Subject with "quotes" & symbols',
        '<p>Body with &lt;tags&gt;</p>'
      );

      expect(mockSendMail).toHaveBeenCalledWith({
        from: 'noreply@test.com',
        to: 'recipient@example.com',
        subject: 'Test Subject with "quotes" & symbols',
        html: '<p>Body with &lt;tags&gt;</p>',
      });
    });
  });

  describe('sendVerificationEmail', () => {
    beforeEach(() => {
      emailService = new EmailService();
    });

    it('should send verification email with correct format', async () => {
      const mockInfo = { messageId: 'test-message-id' };
      mockSendMail.mockResolvedValue(mockInfo);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await emailService.sendVerificationEmail('user@example.com', 123456);

      expect(mockSendMail).toHaveBeenCalledWith({
        from: 'noreply@test.com',
        to: 'user@example.com',
        subject: 'Verify your email address',
        html: expect.stringContaining('Email Verification'),
      });

      // Check that the verification code is included in the HTML
      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('123456');
      expect(callArgs.html).toContain('This verification code will expire in 10 minutes');
      expect(callArgs.html).toContain("If you didn't request this verification, please ignore this email");
    });

    it('should handle zero verification code', async () => {
      const mockInfo = { messageId: 'test-message-id' };
      mockSendMail.mockResolvedValue(mockInfo);

      await emailService.sendVerificationEmail('user@example.com', 0);

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('0');
    });

    it('should handle large verification code', async () => {
      const mockInfo = { messageId: 'test-message-id' };
      mockSendMail.mockResolvedValue(mockInfo);

      await emailService.sendVerificationEmail('user@example.com', 999999);

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('999999');
    });

    it('should propagate errors from sendEmail', async () => {
      const error = new Error('SMTP connection failed');
      mockSendMail.mockRejectedValue(error);

      await expect(emailService.sendVerificationEmail('user@example.com', 123456)).rejects.toThrow(
        'Failed to send email'
      );
    });
  });

  describe('sendPasswordResetEmail', () => {
    beforeEach(() => {
      emailService = new EmailService();
    });

    it('should send password reset email with correct format', async () => {
      const mockInfo = { messageId: 'test-message-id' };
      mockSendMail.mockResolvedValue(mockInfo);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await emailService.sendPasswordResetEmail('user@example.com', 'RESET123');

      expect(mockSendMail).toHaveBeenCalledWith({
        from: 'noreply@test.com',
        to: 'user@example.com',
        subject: 'Your Password Reset Code',
        html: expect.stringContaining('Password Reset'),
      });

      // Check that the reset token is included in the HTML
      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('RESET123');
      expect(callArgs.html).toContain('This password reset code will expire in 10 minutes');
      expect(callArgs.html).toContain("If you didn't request a password reset, please ignore this email");
    });

    it('should handle empty reset token', async () => {
      const mockInfo = { messageId: 'test-message-id' };
      mockSendMail.mockResolvedValue(mockInfo);

      await emailService.sendPasswordResetEmail('user@example.com', '');

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('This password reset code will expire in 10 minutes');
    });

    it('should handle special characters in reset token', async () => {
      const mockInfo = { messageId: 'test-message-id' };
      mockSendMail.mockResolvedValue(mockInfo);

      await emailService.sendPasswordResetEmail('user@example.com', 'RESET-123_ABC');

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('RESET-123_ABC');
    });

    it('should propagate errors from sendEmail', async () => {
      const error = new Error('SMTP connection failed');
      mockSendMail.mockRejectedValue(error);

      await expect(emailService.sendPasswordResetEmail('user@example.com', 'RESET123')).rejects.toThrow(
        'Failed to send email'
      );
    });
  });

  describe('HTML template validation', () => {
    beforeEach(() => {
      emailService = new EmailService();
    });

    it('should generate valid HTML for verification email', async () => {
      const mockInfo = { messageId: 'test-message-id' };
      mockSendMail.mockResolvedValue(mockInfo);

      await emailService.sendVerificationEmail('user@example.com', 123456);

      const callArgs = mockSendMail.mock.calls[0][0];
      const html = callArgs.html;

      // Check for required HTML elements
      expect(html).toContain('<div style="font-family: Arial, sans-serif');
      expect(html).toContain('<h2 style="color: #333;">Email Verification</h2>');
      expect(html).toContain(
        '<h1 style="color: #007bff; margin: 0; font-size: 32px; letter-spacing: 5px;">123456</h1>'
      );
      expect(html).toContain('This verification code will expire in 10 minutes');
    });

    it('should generate valid HTML for password reset email', async () => {
      const mockInfo = { messageId: 'test-message-id' };
      mockSendMail.mockResolvedValue(mockInfo);

      await emailService.sendPasswordResetEmail('user@example.com', 'RESET123');

      const callArgs = mockSendMail.mock.calls[0][0];
      const html = callArgs.html;

      // Check for required HTML elements
      expect(html).toContain('<div style="font-family: Arial, sans-serif');
      expect(html).toContain('<h2 style="color: #333;">Password Reset</h2>');
      expect(html).toContain(
        '<h1 style="color: #007bff; margin: 0; font-size: 32px; letter-spacing: 5px;">RESET123</h1>'
      );
      expect(html).toContain('This password reset code will expire in 10 minutes');
    });
  });

  describe('Error handling and logging', () => {
    beforeEach(() => {
      emailService = new EmailService();
    });

    it('should log success messages correctly', async () => {
      const mockInfo = { messageId: 'test-message-id' };
      mockSendMail.mockResolvedValue(mockInfo);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await emailService.sendEmail('recipient@example.com', 'Test Subject', '<p>Test body</p>');

      expect(consoleSpy).toHaveBeenCalledWith('Email sent successfully:', 'test-message-id');
    });

    it('should log error messages correctly', async () => {
      const error = new Error('SMTP connection failed');
      mockSendMail.mockRejectedValue(error);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(emailService.sendEmail('recipient@example.com', 'Test Subject', '<p>Test body</p>')).rejects.toThrow(
        'Failed to send email'
      );

      expect(consoleSpy).toHaveBeenCalledWith('Error sending email:', error);
    });

    it('should handle different types of SMTP errors', async () => {
      const smtpError = new Error('SMTP: 550 5.1.1 User unknown');
      mockSendMail.mockRejectedValue(smtpError);

      await expect(emailService.sendEmail('recipient@example.com', 'Test Subject', '<p>Test body</p>')).rejects.toThrow(
        'Failed to send email'
      );
    });
  });
});
