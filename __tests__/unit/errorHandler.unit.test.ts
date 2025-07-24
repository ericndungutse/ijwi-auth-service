import { errorHandler } from '../../src/middleware/errorHandler';
import { ApiError } from '../../src/dto/ApiError';

describe('errorHandler middleware', () => {
  const mockReq = {} as any;
  const mockRes = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };
  const mockNext = jest.fn();

  it('should handle ApiError', () => {
    const err = new ApiError('fail', 400);
    const res = mockRes();
    errorHandler(err, mockReq, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'fail', message: 'fail' }));
  });

  it('should handle generic Error', () => {
    const err = new Error('something broke');
    const res = mockRes();
    errorHandler(err, mockReq, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'fail', message: 'something broke' }));
  });
});
