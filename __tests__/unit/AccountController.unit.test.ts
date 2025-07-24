import { AccountController } from '../../src/controllers/AccountController';
import { ApiError } from '../../src/dto/ApiError';

describe('AccountController', () => {
  const mockService = {
    createUser: jest.fn(),
    signIn: jest.fn(),
    verifyEmail: jest.fn(),
  };
  const controller = new AccountController(mockService as any);

  const mockReq = (body: any = {}) => ({ body }) as any;
  const mockRes = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
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
  });
});
