import { AccountController } from '../../src/controllers/AccountController';
import { ApiError } from '../../src/dto/ApiError';

describe('AccountController', () => {
  const mockService = {
    createUser: jest.fn(),
    signIn: jest.fn(),
    verifyEmail: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
  };
  const controller = new AccountController(mockService as any);

  const mockReq = (body: any = {}) => ({ body, headers: {} }) as any;
  const mockRes = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.cookie = jest.fn().mockReturnValue(res);
    return res;
  };
  const mockNext = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should call service and return 201 on success', async () => {
      mockService.createUser.mockResolvedValue({ email: 'a@b.com' });
      const req = mockReq({ userName: 'a', email: 'a@b.com', password: 'pass', confirmPassword: 'pass' });
      const res = mockRes();
      await controller.createUser(req, res, mockNext);
      expect(mockService.createUser).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }));
    });
    it('should call next(error) on error', async () => {
      const error = new ApiError('fail', 400);
      mockService.createUser.mockRejectedValue(error);
      const req = mockReq({});
      const res = mockRes();
      await controller.createUser(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('signIn', () => {
    it('should return 401 if user not found', async () => {
      mockService.signIn.mockResolvedValue(null);
      const req = mockReq({ email: 'a@b.com', password: 'wrong' });
      const res = mockRes();
      await controller.signIn(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'fail' }));
    });
    it('should return 403 if user is inactive', async () => {
      mockService.signIn.mockResolvedValue({ isActive: false });
      const req = mockReq({ email: 'a@b.com', password: 'pass' });
      const res = mockRes();
      await controller.signIn(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(403);
    });
    it('should return 401 if email not verified', async () => {
      mockService.signIn.mockResolvedValue({ isActive: true, emailVerification: { verified: false } });
      const req = mockReq({ email: 'a@b.com', password: 'pass' });
      const res = mockRes();
      await controller.signIn(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(401);
    });
    it('should return 200 and user data on success', async () => {
      mockService.signIn.mockResolvedValue({
        isActive: true,
        emailVerification: { verified: true },
        _id: 'id',
        email: 'a@b.com',
        role: 'user',
        createdAt: new Date(),
        generateJwt: () => 'token',
      });
      const req = mockReq({ email: 'a@b.com', password: 'pass' });
      const res = mockRes();
      await controller.signIn(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }));
    });

    it('should return 200 and include token in response for mobile client', async () => {
      mockService.signIn.mockResolvedValue({
        isActive: true,
        emailVerification: { verified: true },
        _id: 'id',
        email: 'a@b.com',
        role: 'user',
        createdAt: new Date(),
        generateJwt: () => 'mobile-token',
      });
      const req = mockReq({ email: 'a@b.com', password: 'pass' });
      req.headers = { 'x-client-type': 'mobile' };
      const res = mockRes();
      await controller.signIn(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({
            user: expect.objectContaining({
              token: 'mobile-token',
            }),
          }),
        })
      );
    });

    it('should return 200 and set cookie for web client without token in response', async () => {
      mockService.signIn.mockResolvedValue({
        isActive: true,
        emailVerification: { verified: true },
        _id: 'id',
        email: 'a@b.com',
        role: 'user',
        createdAt: new Date(),
        generateJwt: () => 'web-token',
      });
      const req = mockReq({ email: 'a@b.com', password: 'pass' });
      req.headers = { 'x-client-type': 'web' };
      const res = mockRes();
      await controller.signIn(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.cookie).toHaveBeenCalledWith('jwt', 'web-token', expect.any(Object));
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({
            user: expect.not.objectContaining({
              token: expect.anything(),
            }),
          }),
        })
      );
    });

    it('should return 200 and set cookie for undefined client type (default web behavior)', async () => {
      mockService.signIn.mockResolvedValue({
        isActive: true,
        emailVerification: { verified: true },
        _id: 'id',
        email: 'a@b.com',
        role: 'user',
        createdAt: new Date(),
        generateJwt: () => 'default-token',
      });
      const req = mockReq({ email: 'a@b.com', password: 'pass' });
      req.headers = {};
      const res = mockRes();
      await controller.signIn(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.cookie).toHaveBeenCalledWith('jwt', 'default-token', expect.any(Object));
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({
            user: expect.not.objectContaining({
              token: expect.anything(),
            }),
          }),
        })
      );
    });

    it('should return 400 for invalid client type', async () => {
      mockService.signIn.mockResolvedValue({
        isActive: true,
        emailVerification: { verified: true },
        _id: 'id',
        email: 'a@b.com',
        role: 'user',
        createdAt: new Date(),
        generateJwt: () => 'token',
      });
      const req = mockReq({ email: 'a@b.com', password: 'pass' });
      req.headers = { 'x-client-type': 'invalid' };
      const res = mockRes();
      await controller.signIn(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid client type. Must be "mobile" or "web"',
          statusCode: 400,
        })
      );
    });

    it('should handle different JWT_EXPIRES_IN formats for cookie maxAge', async () => {
      // Test hours format
      process.env.JWT_EXPIRES_IN = '2h';
      mockService.signIn.mockResolvedValue({
        isActive: true,
        emailVerification: { verified: true },
        _id: 'id',
        email: 'a@b.com',
        role: 'user',
        createdAt: new Date(),
        generateJwt: () => 'token',
      });
      const req = mockReq({ email: 'a@b.com', password: 'pass' });
      req.headers = { 'x-client-type': 'web' };
      const res = mockRes();
      await controller.signIn(req, res, mockNext);
      expect(res.cookie).toHaveBeenCalledWith(
        'jwt',
        'token',
        expect.objectContaining({
          maxAge: 2 * 60 * 60 * 1000, // 2 hours in milliseconds
        })
      );
    });

    it('should handle minutes format in JWT_EXPIRES_IN', async () => {
      process.env.JWT_EXPIRES_IN = '30m';
      mockService.signIn.mockResolvedValue({
        isActive: true,
        emailVerification: { verified: true },
        _id: 'id',
        email: 'a@b.com',
        role: 'user',
        createdAt: new Date(),
        generateJwt: () => 'token',
      });
      const req = mockReq({ email: 'a@b.com', password: 'pass' });
      req.headers = { 'x-client-type': 'web' };
      const res = mockRes();
      await controller.signIn(req, res, mockNext);
      expect(res.cookie).toHaveBeenCalledWith(
        'jwt',
        'token',
        expect.objectContaining({
          maxAge: 30 * 60 * 1000, // 30 minutes in milliseconds
        })
      );
    });

    it('should handle seconds format in JWT_EXPIRES_IN', async () => {
      process.env.JWT_EXPIRES_IN = '3600s';
      mockService.signIn.mockResolvedValue({
        isActive: true,
        emailVerification: { verified: true },
        _id: 'id',
        email: 'a@b.com',
        role: 'user',
        createdAt: new Date(),
        generateJwt: () => 'token',
      });
      const req = mockReq({ email: 'a@b.com', password: 'pass' });
      req.headers = { 'x-client-type': 'web' };
      const res = mockRes();
      await controller.signIn(req, res, mockNext);
      expect(res.cookie).toHaveBeenCalledWith(
        'jwt',
        'token',
        expect.objectContaining({
          maxAge: 3600 * 1000, // 3600 seconds in milliseconds
        })
      );
    });
  });

  describe('verifyEmail', () => {
    it('should return 400 if email or code missing', async () => {
      const req = mockReq({});
      const res = mockRes();
      await controller.verifyEmail(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(400);
    });
    it('should return 400 if verification fails', async () => {
      mockService.verifyEmail.mockResolvedValue(false);
      const req = mockReq({ email: 'a@b.com', code: 123 });
      const res = mockRes();
      await controller.verifyEmail(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(400);
    });
    it('should return 200 if verification succeeds', async () => {
      mockService.verifyEmail.mockResolvedValue(true);
      const req = mockReq({ email: 'a@b.com', code: 123 });
      const res = mockRes();
      await controller.verifyEmail(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }));
    });
    it('should call next(error) when service throws error', async () => {
      const error = new Error('Service error');
      mockService.verifyEmail.mockRejectedValue(error);
      const req = mockReq({ email: 'a@b.com', code: 123 });
      const res = mockRes();
      await controller.verifyEmail(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('forgotPassword', () => {
    it('should return 400 if email missing', async () => {
      const req = mockReq({});
      const res = mockRes();
      await controller.forgotPassword(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(400);
    });
    it('should call service and return 200 on success', async () => {
      mockService.forgotPassword = jest.fn().mockResolvedValue(undefined);
      const req = mockReq({ email: 'a@b.com' });
      const res = mockRes();
      await controller.forgotPassword(req, res, mockNext);
      expect(mockService.forgotPassword).toHaveBeenCalledWith('a@b.com');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }));
    });
    it('should call next(error) on error', async () => {
      const error = new ApiError('fail', 400);
      mockService.forgotPassword = jest.fn().mockRejectedValue(error);
      const req = mockReq({ email: 'a@b.com' });
      const res = mockRes();
      await controller.forgotPassword(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('resetPassword', () => {
    it('should return 200 and success message for valid reset', async () => {
      mockService.resetPassword.mockResolvedValue();
      const req = mockReq({
        email: 'test@example.com',
        resetCode: 123456,
        newPassword: 'newpassword123',
        confirmPassword: 'newpassword123',
      });
      const res = mockRes();
      await controller.resetPassword(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          message: 'Password has been reset successfully.',
        })
      );
    });

    it('should call next with error when service throws', async () => {
      const error = new ApiError('User not found', 404);
      mockService.resetPassword.mockRejectedValue(error);
      const req = mockReq({
        email: 'test@example.com',
        resetCode: 123456,
        newPassword: 'newpassword123',
        confirmPassword: 'newpassword123',
      });
      const res = mockRes();
      await controller.resetPassword(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle validation errors from service', async () => {
      const error = new ApiError('Email, reset code, new password, and confirm password are required.', 400);
      mockService.resetPassword.mockRejectedValue(error);
      const req = mockReq({
        email: 'test@example.com',
        resetCode: 123456,
        newPassword: 'newpassword123',
        confirmPassword: 'newpassword123',
      });
      const res = mockRes();
      await controller.resetPassword(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle mismatched passwords', async () => {
      mockService.resetPassword.mockRejectedValue(new ApiError('New password and confirm password must match.', 400));
      const req = mockReq({
        email: 'test@example.com',
        resetCode: 123456,
        newPassword: 'newpassword123',
        confirmPassword: 'differentpassword',
      });
      const res = mockRes();
      await controller.resetPassword(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should handle user not found', async () => {
      mockService.resetPassword.mockRejectedValue(new ApiError('User not found', 404));
      const req = mockReq({
        email: 'nonexistent@example.com',
        resetCode: 123456,
        newPassword: 'newpassword123',
        confirmPassword: 'newpassword123',
      });
      const res = mockRes();
      await controller.resetPassword(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should handle invalid reset code', async () => {
      mockService.resetPassword.mockRejectedValue(
        new ApiError('Invalid reset code. Please check your code and try again.', 400)
      );
      const req = mockReq({
        email: 'test@example.com',
        resetCode: 999999,
        newPassword: 'newpassword123',
        confirmPassword: 'newpassword123',
      });
      const res = mockRes();
      await controller.resetPassword(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should handle expired reset code', async () => {
      mockService.resetPassword.mockRejectedValue(
        new ApiError('Password reset code has expired. Please request a new one.', 400)
      );
      const req = mockReq({
        email: 'test@example.com',
        resetCode: 123456,
        newPassword: 'newpassword123',
        confirmPassword: 'newpassword123',
      });
      const res = mockRes();
      await controller.resetPassword(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('should handle no reset code found', async () => {
      mockService.resetPassword.mockRejectedValue(
        new ApiError('No password reset code found. Please request a new one.', 400)
      );
      const req = mockReq({
        email: 'test@example.com',
        resetCode: 123456,
        newPassword: 'newpassword123',
        confirmPassword: 'newpassword123',
      });
      const res = mockRes();
      await controller.resetPassword(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    });
  });

  describe('logout', () => {
    it('should clear JWT cookie for web clients', async () => {
      const mockRequest = {
        headers: {
          'x-client-type': 'web',
        },
      } as any;

      const mockResponse = {
        cookie: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      const mockNext = jest.fn();

      await controller.logout(mockRequest, mockResponse, mockNext);

      expect(mockResponse.cookie).toHaveBeenCalledWith('jwt', '', {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 0,
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Logged out successfully',
        data: null,
      });
    });

    it('should return 400 error for mobile clients', async () => {
      const mockRequest = {
        headers: {
          'x-client-type': 'mobile',
        },
      } as any;

      const mockResponse = {
        cookie: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      const mockNext = jest.fn();

      await controller.logout(mockRequest, mockResponse, mockNext);

      expect(mockResponse.cookie).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'fail',
        message: 'Logout failed.',
        errors: [{ message: 'Logout failed. Mobile clients logout is not supported.' }],
      });
    });

    it('should handle undefined client type as web client', async () => {
      const mockRequest = {
        headers: {},
      } as any;

      const mockResponse = {
        cookie: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      const mockNext = jest.fn();

      await controller.logout(mockRequest, mockResponse, mockNext);

      expect(mockResponse.cookie).toHaveBeenCalledWith('jwt', '', {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 0,
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Logged out successfully',
        data: null,
      });
    });

    it('should handle null client type as web client', async () => {
      const mockRequest = {
        headers: {
          'x-client-type': null,
        },
      } as any;

      const mockResponse = {
        cookie: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      const mockNext = jest.fn();

      await controller.logout(mockRequest, mockResponse, mockNext);

      expect(mockResponse.cookie).toHaveBeenCalledWith('jwt', '', {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 0,
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Logged out successfully',
        data: null,
      });
    });

    it('should handle empty string client type as web client', async () => {
      const mockRequest = {
        headers: {
          'x-client-type': '',
        },
      } as any;

      const mockResponse = {
        cookie: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      const mockNext = jest.fn();

      await controller.logout(mockRequest, mockResponse, mockNext);

      expect(mockResponse.cookie).toHaveBeenCalledWith('jwt', '', {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 0,
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Logged out successfully',
        data: null,
      });
    });

    it('should handle error and call next', async () => {
      const mockRequest = {
        headers: {
          'x-client-type': 'web',
        },
      } as any;

      const mockResponse = {
        cookie: jest.fn().mockImplementation(() => {
          throw new Error('Cookie error');
        }),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      const mockNext = jest.fn();

      await controller.logout(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
