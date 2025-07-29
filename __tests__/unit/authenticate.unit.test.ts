import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate } from '../../src/middleware/authenticate';
import { Account } from '../../src/models/account/account.model';
import { ApiError } from '../../src/dto/ApiError';

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('../../src/models/account/account.model');

const mockJwt = jwt as jest.Mocked<typeof jwt>;
const mockAccount = Account as jest.Mocked<typeof Account>;

describe('authenticate middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
      cookies: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();

    // Reset all mocks
    jest.clearAllMocks();

    // Set up environment variable
    process.env.JWT_SECRET = 'test-secret';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  describe('Token extraction', () => {
    it('should extract token from Authorization header with Bearer prefix', async () => {
      const token = 'valid-token';
      mockReq.headers = { authorization: `Bearer ${token}` };

      const mockDecoded = {
        id: 'user-id',
        email: 'test@example.com',
        role: 'user',
        iat: 1234567890,
        exp: 1234567890,
      };

      mockJwt.verify.mockReturnValue(mockDecoded as any);
      mockAccount.findById.mockResolvedValue({
        _id: 'user-id',
        isActive: true,
        emailVerification: { verified: true },
      } as any);

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockJwt.verify).toHaveBeenCalledWith(token, 'test-secret');
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should extract token from cookies when not in Authorization header', async () => {
      const token = 'valid-token';
      mockReq.cookies = { jwt: token };

      const mockDecoded = {
        id: 'user-id',
        email: 'test@example.com',
        role: 'user',
        iat: 1234567890,
        exp: 1234567890,
      };

      mockJwt.verify.mockReturnValue(mockDecoded as any);
      mockAccount.findById.mockResolvedValue({
        _id: 'user-id',
        isActive: true,
        emailVerification: { verified: true },
      } as any);

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockJwt.verify).toHaveBeenCalledWith(token, 'test-secret');
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should return 401 when no token is provided', async () => {
      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'fail',
        message: 'Authentication failed',
        errors: [{ message: 'No JWT token provided. Please provide a valid token in Authorization header or cookie.' }],
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Token validation', () => {
    it('should handle JWT verification errors', async () => {
      const token = 'invalid-token';
      mockReq.headers = { authorization: `Bearer ${token}` };

      const jwtError = new Error('jwt verification failed');
      mockJwt.verify.mockImplementation(() => {
        throw jwtError;
      });

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Authentication failed',
          statusCode: 401,
        })
      );
    });

    it('should handle generic error', async () => {
      const token = 'error-token';
      mockReq.headers = { authorization: `Bearer ${token}` };

      const genericError = new Error('Something went wrong');
      mockJwt.verify.mockImplementation(() => {
        throw genericError;
      });

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Authentication failed',
          statusCode: 401,
        })
      );
    });
  });

  describe('User verification', () => {
    it('should return 401 when user no longer exists', async () => {
      const token = 'valid-token';
      mockReq.headers = { authorization: `Bearer ${token}` };

      const mockDecoded = {
        id: 'user-id',
        email: 'test@example.com',
        role: 'user',
        iat: 1234567890,
        exp: 1234567890,
      };

      mockJwt.verify.mockReturnValue(mockDecoded as any);
      mockAccount.findById.mockResolvedValue(null);

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'fail',
        message: 'Authentication failed',
        errors: [{ message: 'User no longer exists.' }],
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when user account is deactivated', async () => {
      const token = 'valid-token';
      mockReq.headers = { authorization: `Bearer ${token}` };

      const mockDecoded = {
        id: 'user-id',
        email: 'test@example.com',
        role: 'user',
        iat: 1234567890,
        exp: 1234567890,
      };

      mockJwt.verify.mockReturnValue(mockDecoded as any);
      mockAccount.findById.mockResolvedValue({
        _id: 'user-id',
        isActive: false,
        emailVerification: { verified: true },
      } as any);

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'fail',
        message: 'Authentication failed',
        errors: [{ message: 'User account is deactivated.' }],
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when email is not verified', async () => {
      const token = 'valid-token';
      mockReq.headers = { authorization: `Bearer ${token}` };

      const mockDecoded = {
        id: 'user-id',
        email: 'test@example.com',
        role: 'user',
        iat: 1234567890,
        exp: 1234567890,
      };

      mockJwt.verify.mockReturnValue(mockDecoded as any);
      mockAccount.findById.mockResolvedValue({
        _id: 'user-id',
        isActive: true,
        emailVerification: { verified: false },
      } as any);

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'fail',
        message: 'Authentication failed',
        errors: [{ message: 'Email not verified. Please verify your email before accessing protected routes.' }],
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Successful authentication', () => {
    it('should attach user to request and call next when all checks pass', async () => {
      const token = 'valid-token';
      mockReq.headers = { authorization: `Bearer ${token}` };

      const mockDecoded = {
        id: 'user-id',
        email: 'test@example.com',
        role: 'user',
        iat: 1234567890,
        exp: 1234567890,
      };

      const mockUser = {
        _id: 'user-id',
        email: 'test@example.com',
        isActive: true,
        emailVerification: { verified: true },
      };

      mockJwt.verify.mockReturnValue(mockDecoded as any);
      mockAccount.findById.mockResolvedValue(mockUser as any);

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should work with cookie token when header is not present', async () => {
      const token = 'valid-token';
      mockReq.cookies = { jwt: token };

      const mockDecoded = {
        id: 'user-id',
        email: 'test@example.com',
        role: 'user',
        iat: 1234567890,
        exp: 1234567890,
      };

      const mockUser = {
        _id: 'user-id',
        email: 'test@example.com',
        isActive: true,
        emailVerification: { verified: true },
      };

      mockJwt.verify.mockReturnValue(mockDecoded as any);
      mockAccount.findById.mockResolvedValue(mockUser as any);

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('Edge cases', () => {
    it('should handle missing JWT_SECRET environment variable', async () => {
      delete process.env.JWT_SECRET;

      const token = 'valid-token';
      mockReq.headers = { authorization: `Bearer ${token}` };

      const genericError = new Error('jwt must be provided') as any;
      mockJwt.verify.mockImplementation(() => {
        throw genericError;
      });

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Authentication failed',
          statusCode: 401,
        })
      );
    });

    it('should prioritize Authorization header over cookie', async () => {
      const headerToken = 'header-token';
      const cookieToken = 'cookie-token';
      mockReq.headers = { authorization: `Bearer ${headerToken}` };
      mockReq.cookies = { jwt: cookieToken };

      const mockDecoded = {
        id: 'user-id',
        email: 'test@example.com',
        role: 'user',
        iat: 1234567890,
        exp: 1234567890,
      };

      const mockUser = {
        _id: 'user-id',
        email: 'test@example.com',
        isActive: true,
        emailVerification: { verified: true },
      };

      mockJwt.verify.mockReturnValue(mockDecoded as any);
      mockAccount.findById.mockResolvedValue(mockUser as any);

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockJwt.verify).toHaveBeenCalledWith(headerToken, 'test-secret');
      expect(mockJwt.verify).not.toHaveBeenCalledWith(cookieToken, 'test-secret');
    });

    it('should handle undefined cookies', async () => {
      mockReq.cookies = undefined;

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'fail',
        message: 'Authentication failed',
        errors: [{ message: 'No JWT token provided. Please provide a valid token in Authorization header or cookie.' }],
      });
    });
  });
});
