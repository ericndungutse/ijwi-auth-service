import { AccountService } from '../../src/services/impl/AccountService';
import { ApiError } from '../../src/dto/ApiError';
import { hashDigitCode } from '../../src/utils/generateCode';

describe('AccountService', () => {
  const mockRepo = {
    createAccount: jest.fn(),
    getVerificationCode: jest.fn(),
    findByEmail: jest.fn(),
    findById: jest.fn(),
    verifyEmail: jest.fn(),
    deleteAccount: jest.fn(),
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

  describe('resetPassword', () => {
    it('throws if email is missing', async () => {
      await expect(service.resetPassword('', 123456, 'newpass', 'newpass')).rejects.toThrow(ApiError);
    });

    it('throws if resetCode is missing', async () => {
      await expect(service.resetPassword('a@b.com', 0, 'newpass', 'newpass')).rejects.toThrow(ApiError);
    });

    it('throws if newPassword is missing', async () => {
      await expect(service.resetPassword('a@b.com', 123456, '', 'newpass')).rejects.toThrow(ApiError);
    });

    it('throws if confirmPassword is missing', async () => {
      await expect(service.resetPassword('a@b.com', 123456, 'newpass', '')).rejects.toThrow(ApiError);
    });

    it('throws if passwords do not match', async () => {
      await expect(service.resetPassword('a@b.com', 123456, 'newpass', 'differentpass')).rejects.toThrow(ApiError);
    });

    it('throws if user not found', async () => {
      mockRepo.findByEmail.mockResolvedValue(null);
      await expect(service.resetPassword('notfound@b.com', 123456, 'newpass', 'newpass')).rejects.toThrow(ApiError);
    });

    it('throws if no reset code found', async () => {
      const user = {
        email: 'a@b.com',
        passwordResetCode: null,
        passwordResetCodeExpires: null,
      };
      mockRepo.findByEmail.mockResolvedValue(user);
      await expect(service.resetPassword('a@b.com', 123456, 'newpass', 'newpass')).rejects.toThrow(ApiError);
    });

    it('throws if reset code expired', async () => {
      const user = {
        email: 'a@b.com',
        passwordResetCode: 'hashedcode',
        passwordResetCodeExpires: new Date(Date.now() - 1000), // expired
      };
      mockRepo.findByEmail.mockResolvedValue(user);
      await expect(service.resetPassword('a@b.com', 123456, 'newpass', 'newpass')).rejects.toThrow(ApiError);
    });

    it('throws if invalid reset code', async () => {
      const user = {
        email: 'a@b.com',
        passwordResetCode: 'hashedcode',
        passwordResetCodeExpires: new Date(Date.now() + 10000), // not expired
        save: jest.fn().mockResolvedValue(true),
      };
      mockRepo.findByEmail.mockResolvedValue(user);
      await expect(service.resetPassword('a@b.com', 123456, 'newpass', 'newpass')).rejects.toThrow(ApiError);
    });

    it('resets password successfully with valid code', async () => {
      const code = 123456;
      const hashedCode = require('crypto').createHash('sha256').update(String(code)).digest('hex');
      const save = jest.fn().mockResolvedValue(true);
      const user = {
        email: 'a@b.com',
        password: 'oldpassword',
        passwordResetCode: hashedCode,
        passwordResetCodeExpires: new Date(Date.now() + 10000), // not expired
        save,
      };
      mockRepo.findByEmail.mockResolvedValue(user);
      await service.resetPassword('a@b.com', code, 'newpassword', 'newpassword');
      expect(user.password).toBe('newpassword');
      expect(user.passwordResetCode).toBeNull();
      expect(user.passwordResetCodeExpires).toBeNull();
      expect(save).toHaveBeenCalled();
    });

    it('resets password with special characters', async () => {
      const code = 123456;
      const hashedCode = require('crypto').createHash('sha256').update(String(code)).digest('hex');
      const save = jest.fn().mockResolvedValue(true);
      const user = {
        email: 'a@b.com',
        password: 'oldpassword',
        passwordResetCode: hashedCode,
        passwordResetCodeExpires: new Date(Date.now() + 10000),
        save,
      };
      mockRepo.findByEmail.mockResolvedValue(user);
      const newPassword = 'NewP@ssw0rd!';
      await service.resetPassword('a@b.com', code, newPassword, newPassword);
      expect(user.password).toBe(newPassword);
      expect(user.passwordResetCode).toBeNull();
      expect(user.passwordResetCodeExpires).toBeNull();
      expect(save).toHaveBeenCalled();
    });

    it('resets password with minimum length', async () => {
      const code = 123456;
      const hashedCode = require('crypto').createHash('sha256').update(String(code)).digest('hex');
      const save = jest.fn().mockResolvedValue(true);
      const user = {
        email: 'a@b.com',
        password: 'oldpassword',
        passwordResetCode: hashedCode,
        passwordResetCodeExpires: new Date(Date.now() + 10000),
        save,
      };
      mockRepo.findByEmail.mockResolvedValue(user);
      const newPassword = '123456'; // minimum 6 characters
      await service.resetPassword('a@b.com', code, newPassword, newPassword);
      expect(user.password).toBe(newPassword);
      expect(user.passwordResetCode).toBeNull();
      expect(user.passwordResetCodeExpires).toBeNull();
      expect(save).toHaveBeenCalled();
    });
  });

  describe('updatePassword', () => {
    const mockUser = {
      _id: 'user123',
      email: 'test@example.com',
      password: 'hashedPassword',
      comparePassword: jest.fn(),
      save: jest.fn(),
    } as any;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should successfully update password when all validations pass', async () => {
      mockRepo.findById.mockResolvedValue(mockUser);
      mockUser.comparePassword.mockResolvedValue(true);
      mockUser.save.mockResolvedValue(mockUser);

      await service.updatePassword('user123', 'currentPassword', 'NewPassword123!', 'NewPassword123!');

      expect(mockRepo.findById).toHaveBeenCalledWith('user123');
      expect(mockUser.comparePassword).toHaveBeenCalledWith('currentPassword');
      expect(mockUser.password).toBe('NewPassword123!');
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should throw error when current password is incorrect', async () => {
      mockRepo.findById.mockResolvedValue(mockUser);
      mockUser.comparePassword.mockResolvedValue(false);

      await expect(
        service.updatePassword('user123', 'wrongPassword', 'NewPassword123!', 'NewPassword123!')
      ).rejects.toThrow('Current password is incorrect.');

      expect(mockUser.comparePassword).toHaveBeenCalledWith('wrongPassword');
      expect(mockUser.save).not.toHaveBeenCalled();
    });

    it('should throw error when new password and confirm password do not match', async () => {
      await expect(
        service.updatePassword('user123', 'currentPassword', 'NewPassword123!', 'DifferentPassword123!')
      ).rejects.toThrow('New password and confirm password must match.');
    });

    it('should throw error when current password and new password are the same', async () => {
      await expect(
        service.updatePassword('user123', 'SamePassword123!', 'SamePassword123!', 'SamePassword123!')
      ).rejects.toThrow('New password must be different from current password.');
    });

    it('should throw error when user is not found', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(
        service.updatePassword('nonexistent', 'currentPassword', 'NewPassword123!', 'NewPassword123!')
      ).rejects.toThrow('User not found');
    });

    it('should throw error when required fields are missing', async () => {
      await expect(service.updatePassword('user123', '', 'NewPassword123!', 'NewPassword123!')).rejects.toThrow(
        'Current password, new password, and confirm password are required.'
      );
    });
  });

  describe('deleteAccount', () => {
    const mockUser = {
      _id: 'user123',
      email: 'test@example.com',
      isActive: true,
    } as any;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should successfully delete account when user exists and is active', async () => {
      mockRepo.findById.mockResolvedValue(mockUser);
      mockRepo.deleteAccount.mockResolvedValue(undefined);

      await service.deleteAccount('user123');

      expect(mockRepo.findById).toHaveBeenCalledWith('user123');
      expect(mockRepo.deleteAccount).toHaveBeenCalledWith('user123');
    });

    it('should throw error when userId is not provided', async () => {
      await expect(service.deleteAccount('')).rejects.toThrow('User ID is required.');
      await expect(service.deleteAccount(null as any)).rejects.toThrow('User ID is required.');
      await expect(service.deleteAccount(undefined as any)).rejects.toThrow('User ID is required.');
    });

    it('should throw error when user is not found', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.deleteAccount('nonexistent')).rejects.toThrow('User not found');
      expect(mockRepo.findById).toHaveBeenCalledWith('nonexistent');
      expect(mockRepo.deleteAccount).not.toHaveBeenCalled();
    });

    it('should throw error when account is already inactive', async () => {
      const inactiveUser = {
        _id: 'user123',
        email: 'test@example.com',
        isActive: false,
      };
      mockRepo.findById.mockResolvedValue(inactiveUser);

      await expect(service.deleteAccount('user123')).rejects.toThrow('Account is already inactive.');
      expect(mockRepo.findById).toHaveBeenCalledWith('user123');
      expect(mockRepo.deleteAccount).not.toHaveBeenCalled();
    });

    it('should handle repository errors during deletion', async () => {
      mockRepo.findById.mockResolvedValue(mockUser);
      mockRepo.deleteAccount.mockRejectedValue(new Error('Database error'));

      await expect(service.deleteAccount('user123')).rejects.toThrow('Database error');
      expect(mockRepo.findById).toHaveBeenCalledWith('user123');
      expect(mockRepo.deleteAccount).toHaveBeenCalledWith('user123');
    });

    it('should handle repository errors when user not found during deletion', async () => {
      mockRepo.findById.mockResolvedValue(mockUser);
      mockRepo.deleteAccount.mockRejectedValue(new Error('User not found'));

      await expect(service.deleteAccount('user123')).rejects.toThrow('User not found');
      expect(mockRepo.findById).toHaveBeenCalledWith('user123');
      expect(mockRepo.deleteAccount).toHaveBeenCalledWith('user123');
    });
  });
});
