import { AccountService } from './../../src/services/impl/AccountService';
import { AccountRepository } from '../../src/repository/AccountRepository';
import { hashDigitCode } from '../../src/utils/generateCode';

describe('AccountRepository', () => {
  const mockModel = {
    create: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    emailService: jest.fn(),
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
});
