import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../dto/ApiError';
import { MongoServerError } from 'mongodb';

export function errorHandler(
  err: Error | ApiError | MongoServerError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const status = (err instanceof ApiError && err.statusCode) || 500;
  const message = err.message || 'Internal Server Error';

  // Log error details (could be enhanced with a logger)
  if (process.env.NODE_ENV !== 'test') {
    console.error(err);
  }

  // Handle duplicate email error from MongoDB
  if (err instanceof MongoServerError && err.code === 11000 && err.keyPattern && err?.keyPattern?.email) {
    return res.status(409).json({
      status: 'fail',
      message: 'Registration failed',
      errors: [{ message: 'Email already exists' }],
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }

  res.status(status).json({
    status: 'fail',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
