import { AccountService } from './../../src/services/impl/AccountService';
import { AccountRepository } from '../../src/repository/AccountRepository';
import { hashDigitCode } from '../../src/utils/generateCode';

describe('AccountRepository', () => {
  const mockModel = {
    create: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    emailService: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };
  const repo = new AccountRepository(mockModel as any);
  const accountService = new AccountService(repo, mockModel.emailService as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('createAccount calls model.create', async () => {
    mockModel.create.mockResolvedValue({ email: 'a@b.com' });
    const result = await repo.createAccount({
      userName: 'a',
      email: 'a@b.com',
      password: 'pass',
      confirmPassword: 'pass',
    });
    expect(mockModel.create).toHaveBeenCalled();
    expect(result).toEqual({ email: 'a@b.com' });
  });

  it('findByEmail calls model.findOne', async () => {
    mockModel.findOne.mockResolvedValue({ email: 'a@b.com' });
    const result = await repo.findByEmail('a@b.com');
    expect(mockModel.findOne).toHaveBeenCalledWith({ email: 'a@b.com' });
    expect(result).toEqual({ email: 'a@b.com' });
  });

  it('verifyEmail returns false if user not found', async () => {
    mockModel.findOne.mockResolvedValue(null);
    await expect(accountService.verifyEmail('a@b.com', 123)).rejects.toThrow('User not found');
  });

  it('verifyEmail sets verified true and saves if user found', async () => {
    const user = { emailVerification: { verified: false, code: hashDigitCode(123) }, save: jest.fn() };
    mockModel.findOne.mockResolvedValue(user);
    const result = await accountService.verifyEmail('a@b.com', 123);
    expect(user.emailVerification.verified).toBe(true);
    expect(user.save).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('findById calls model.findById', async () => {
    mockModel.findById.mockResolvedValue({ _id: 'user123', email: 'a@b.com' });
    const result = await repo.findById('user123');
    expect(mockModel.findById).toHaveBeenCalledWith('user123');
    expect(result).toEqual({ _id: 'user123', email: 'a@b.com' });
  });

  describe('deleteAccount', () => {
    it('should successfully delete account when user exists', async () => {
      const mockUser = { _id: 'user123', email: 'test@example.com', isActive: false };
      mockModel.findByIdAndUpdate.mockResolvedValue(mockUser);

      await repo.deleteAccount('user123');

      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith('user123', { isActive: false }, { new: true });
    });

    it('should throw error when user is not found', async () => {
      mockModel.findByIdAndUpdate.mockResolvedValue(null);

      await expect(repo.deleteAccount('nonexistent')).rejects.toThrow('User not found');
      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith('nonexistent', { isActive: false }, { new: true });
    });

    it('should handle database errors during deletion', async () => {
      mockModel.findByIdAndUpdate.mockRejectedValue(new Error('Database connection error'));

      await expect(repo.deleteAccount('user123')).rejects.toThrow('Database connection error');
      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith('user123', { isActive: false }, { new: true });
    });
  });
});
