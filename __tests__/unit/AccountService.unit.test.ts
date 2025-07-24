import { AccountService } from '../../src/services/impl/AccountService';
import { ApiError } from '../../src/dto/ApiError';

describe('AccountService', () => {
  const mockRepo = {
    createAccount: jest.fn(),
    getVerificationCode: jest.fn(),
    findByEmail: jest.fn(),
    verifyEmail: jest.fn(),
  };
  const mockEmail = {
    sendVerificationEmail: jest.fn(),
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
      mockRepo.createAccount.mockResolvedValue({ email: 'a@b.com', emailVerification: { code: 123 } });
      mockRepo.getVerificationCode.mockReturnValue(123);
      await service.createUser({ userName: 'a', email: 'a@b.com', password: 'pass', confirmPassword: 'pass' });
      expect(mockRepo.createAccount).toHaveBeenCalled();
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
      mockRepo.verifyEmail.mockResolvedValue(true);
      const result = await service.verifyEmail('a@b.com', 123);
      expect(result).toBe(true);
      expect(mockRepo.verifyEmail).toHaveBeenCalledWith('a@b.com', 123);
    });
  });
});
