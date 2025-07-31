const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const accountRouter = require('./routes/account.routes');

import { Application, Request, Response, NextFunction } from 'express';
import { ApiResponse } from './dto/ApiResponse';
import { errorHandler } from './middleware/errorHandler';
import { ApiError } from './dto/ApiError';
import hashString from './utils/hashString';

// Load environment variables
dotenv.config();

export class App {
  public app: Application;

  constructor() {
    this.app = express();
    this.initializeInternalSignatureMiddleware();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }
  private initializeInternalSignatureMiddleware(): void {
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      // Allow requests in test route
      if (process.env.NODE_ENV === 'test') {
        return next();
      }

      // Allow requests in health check route
      if (req.path === '/health') {
        return next();
      }

      const hashedSignature = req.headers['x-internal-signature'];
      const internalTimestamp = req.headers['x-internal-timestamp'];

      if (!hashedSignature || !internalTimestamp) {
        return next(new ApiError('Unauthorized. Request did not come from API Gateway', 401));
      }

      // Get Internal Signature
      const internalSignature: string = process.env.INTERNAL_SIGNATURE || '';

      if (!internalSignature) {
        return next(new ApiError('Internal server error', 500));
      }

      // Get Hashed Internal Signature
      const hashedInternalSignature = hashString(internalSignature);

      // Compare Hashed Internal Signature with the one in the request
      if (hashedInternalSignature !== hashedSignature) {
        return next(new ApiError('Unauthorized. Request did not come from API Gateway', 401));
      }

      // Prevent replay attacks. Allow 1 minute of leeway
      if (Number(internalTimestamp) < Date.now() - 60000) {
        return next(new ApiError('Unauthorized. Request is too old', 401));
      }

      next();
    });
  }

  private initializeMiddlewares(): void {
    // Body parser middlewares
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Cookie parser middleware
    this.app.use(cookieParser());

    // CORS middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'];
      const origin = req.headers.origin;

      if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      }

      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-client-type');
      res.setHeader('Access-Control-Allow-Credentials', 'true');

      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
      }

      next();
    });

    // Request logging middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  private initializeRoutes(): void {
    // Health check route
    this.app.get('/health', (req: Request, res: Response) => {
      const response: ApiResponse<{ status: string; timestamp: string }, null> = {
        status: 'success',
        message: 'Auth service is healthy',
        data: {
          status: 'OK',
          timestamp: new Date().toISOString(),
        },
      };
      res.status(200).json(response);
    });

    // API routes
    this.app.use('/api/v1/auth', accountRouter);

    // 404 handler
    this.app.use('*', (req: Request, res: Response) => {
      const response: ApiResponse<null, { message: string; field: string }[]> = {
        status: 'fail',
        message: `Route ${req.originalUrl} not found`,
        data: null,
        errors: [{ message: `Route ${req.originalUrl} not found`, field: 'url' }],
      };
      res.status(404).json(response);
    });
  }

  private initializeErrorHandling(): void {
    // Use the centralized error handler middleware
    this.app.use(errorHandler);
  }

  public async connectToDatabase(): Promise<void> {
    try {
      const mongoUri = process.env.MONGODB_URI;
      if (!mongoUri) {
        throw new Error('MONGODB_URI is not defined in environment variables');
      }

      await mongoose.connect(mongoUri);
      console.log('✅ Connected to MongoDB successfully');

      // Handle connection events
      mongoose.connection.on('error', (error: any) => {
        console.error('❌ MongoDB connection error:', error);
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('⚠️ MongoDB disconnected');
      });

      mongoose.connection.on('reconnected', () => {
        console.log('✅ MongoDB reconnected');
      });
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error);
      process.exit(1);
    }
  }

  public getApp(): Application {
    return this.app;
  }
}
