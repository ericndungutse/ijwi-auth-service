import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Account } from '../models/account/account.model';
import { ApiError } from '../dto/ApiError';
import { ApiResponse } from '../dto/ApiResponse';

// Extend the Request interface to include user property
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

interface JwtPayload {
  id: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let token: string | undefined;

    // Check for token in Authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
    }

    // Check for token in cookie if not found in header
    if (!token && req.cookies && req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    // If no token found, return 401
    if (!token) {
      const response: ApiResponse<null, { message: string }[]> = {
        status: 'fail',
        message: 'Authentication failed',
        errors: [{ message: 'No JWT token provided. Please provide a valid token in Authorization header or cookie.' }],
      };
      res.status(401).json(response);
      return;
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

    // Check if user still exists in database
    const user = await Account.findById(decoded.id);
    if (!user) {
      const response: ApiResponse<null, { message: string }[]> = {
        status: 'fail',
        message: 'Authentication failed',
        errors: [{ message: 'User no longer exists.' }],
      };
      res.status(401).json(response);
      return;
    }

    // Check if user is still active
    if (!user.isActive) {
      const response: ApiResponse<null, { message: string }[]> = {
        status: 'fail',
        message: 'Authentication failed',
        errors: [{ message: 'User account is deactivated.' }],
      };
      res.status(401).json(response);
      return;
    }

    // Check if user has verified their email
    if (!user.emailVerification.verified) {
      const response: ApiResponse<null, { message: string }[]> = {
        status: 'fail',
        message: 'Authentication failed',
        errors: [{ message: 'Email not verified. Please verify your email before accessing protected routes.' }],
      };
      res.status(401).json(response);
      return;
    }

    // Attach user to request object
    req.user = user;

    next();
  } catch (error) {
    let message = 'Authentication failed';

    if (error instanceof jwt.JsonWebTokenError) {
      if (error.name === 'TokenExpiredError') {
        message = 'JWT token has expired';
      } else if (error.name === 'JsonWebTokenError') {
        message = 'Invalid JWT token';
      } else {
        message = 'JWT token error';
      }
    } else if (error instanceof jwt.NotBeforeError) {
      message = 'JWT token not active';
    }

    next(new ApiError(message, 401));
  }
};
