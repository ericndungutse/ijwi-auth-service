import { AccountService } from '../../src/services/impl/AccountService';
import { ApiError } from '../../src/dto/ApiError';
import { hashDigitCode } from '../../src/utils/generateCode';

describe('AccountService', () => {
  const mockRepo = {
    createAccount: jest.fn(),
    getVerificationCode: jest.fn(),
    findByEmail: jest.fn(),
    verifyEmail: jest.fn(),
  };
  const mockEmail = {
    sendVerificationEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
  };
  const service = new AccountService(mockRepo as any, mockEmail as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('throws if email or password is missing', async () => {
      await expect(service.createUser({ userName: '', email: '', password: '', confirmPassword: '' })).rejects.toThrow(
        ApiError
      );
      await expect(
        service.createUser({ userName: 'a', email: 'a@b.com', password: '', confirmPassword: '' })
      ).rejects.toThrow(ApiError);
      await expect(
        service.createUser({ userName: 'a', email: '', password: 'pass', confirmPassword: '' })
      ).rejects.toThrow(ApiError);
    });
    it('calls repo and email service on success', async () => {
      const mockUser = {
        email: 'a@b.com',
        emailVerification: { code: 123 },
        generateEmailVerificationCode: jest.fn().mockReturnValue(123),
        save: jest.fn().mockResolvedValue(true),
      };
      mockRepo.createAccount.mockResolvedValue(mockUser);
      mockRepo.getVerificationCode.mockReturnValue(123);
      await service.createUser({ userName: 'a', email: 'a@b.com', password: 'pass', confirmPassword: 'pass' });
      expect(mockRepo.createAccount).toHaveBeenCalled();
      expect(mockUser.generateEmailVerificationCode).toHaveBeenCalled();
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockEmail.sendVerificationEmail).toHaveBeenCalledWith('a@b.com', 123);
    });
  });

  describe('signIn', () => {
    it('returns user if credentials are valid', async () => {
      const user = { comparePassword: jest.fn().mockResolvedValue(true) };
      mockRepo.findByEmail.mockResolvedValue(user);
      const result = await service.signIn('a@b.com', 'pass');
      expect(result).toBe(user);
    });
    it('returns null if user not found', async () => {
      mockRepo.findByEmail.mockResolvedValue(null);
      const result = await service.signIn('notfound@b.com', 'pass');
      expect(result).toBeNull();
    });
    it('returns null if password is invalid', async () => {
      const user = { comparePassword: jest.fn().mockResolvedValue(false) };
      mockRepo.findByEmail.mockResolvedValue(user);
      const result = await service.signIn('a@b.com', 'wrong');
      expect(result).toBeNull();
    });
  });

  describe('verifyEmail', () => {
    it('calls repo.verifyEmail and returns result', async () => {
      const code = 123;
      const mockUser = {
        emailVerification: { code: hashDigitCode(code), verified: false },
        save: jest.fn().mockResolvedValue(true),
      };
      mockRepo.findByEmail.mockResolvedValue(mockUser);
      const result = await service.verifyEmail('a@b.com', code);
      expect(result).toBe(true);
      expect(mockUser.save).toHaveBeenCalled();
    });
    it('throws error if code is invalid or already verified', async () => {
      mockRepo.findByEmail.mockResolvedValue({
        emailVerification: { code: hashDigitCode(123), verified: true },
        save: jest.fn().mockResolvedValue(true),
      });
      await expect(service.verifyEmail('a@b.com', 999999)).rejects.toThrow('Invalid code or already verified');
    });
  });

  describe('forgotPassword', () => {
    it('throws if user not found', async () => {
      mockRepo.findByEmail.mockResolvedValue(null);
      await expect(service.forgotPassword('notfound@b.com')).rejects.toThrow(ApiError);
    });
    it('sets hashed code and expiration, calls email service', async () => {
      const save = jest.fn().mockResolvedValue(true);
      const user = {
        email: 'a@b.com',
        save,
        passwordResetCode: null,
        passwordResetCodeExpires: null,
      };
      mockRepo.findByEmail.mockResolvedValue(user);
      mockEmail.sendPasswordResetEmail = jest.fn().mockResolvedValue(true);
      await service.forgotPassword('a@b.com');
      expect(user.passwordResetCode).toBeDefined();
      expect(user.passwordResetCodeExpires).toBeInstanceOf(Date);
      expect(save).toHaveBeenCalled();
      expect(mockEmail.sendPasswordResetEmail).toHaveBeenCalledWith('a@b.com', expect.any(String));
    });
  });
});
