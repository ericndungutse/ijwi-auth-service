import { ApiError } from '../../src/dto/ApiError';

describe('ApiError', () => {
  it('should set message and statusCode', () => {
    const err = new ApiError('fail', 400);
    expect(err.message).toBe('fail');
    expect(err.statusCode).toBe(400);
  });
  it('should default statusCode to 500', () => {
    const err = new ApiError('fail');
    expect(err.statusCode).toBe(500);
  });
});
