const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const accountRouter = require('./routes/account.routes');

import { Application, Request, Response, NextFunction } from 'express';
import { ApiResponse } from './dto/ApiResponse';

// Load environment variables
dotenv.config();

export class App {
  public app: Application;

  constructor() {
    this.app = express();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // Body parser middlewares
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // CORS middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'];
      const origin = req.headers.origin;

      if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      }

      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      //   res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      //   res.setHeader('Access-Control-Allow-Credentials', 'true');

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
        error: [{ message: `Route ${req.originalUrl} not found`, field: 'url' }],
      };
      res.status(404).json(response);
    });
  }

  private initializeErrorHandling(): void {
    // Global error handler
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('Global Error Handler:', error);

      // Mongoose validation error
      if (error.name === 'ValidationError') {
        const response: ApiResponse<null, string[]> = {
          status: 'fail',
          message: 'Validation failed',
          data: null,
          error: Object.values(error).map((err: any) => err.message),
        };
        return res.status(400).json(response);
      }

      // Mongoose duplicate key error
      if (error.name === 'MongoServerError' && (error as any).code === 11000) {
        const response: ApiResponse<null, { field: string; message: string }[]> = {
          status: 'fail',
          message: 'Duplicate entry detected',
          data: null,
          error: [{ field: (error as any).keyValue.email, message: error.message }],
        };
        return res.status(409).json(response);
      }

      // JWT errors
      if (error.name === 'JsonWebTokenError') {
        const response: ApiResponse<null, { message: string; field: string }[]> = {
          status: 'fail',
          message: 'Invalid token',
          data: null,
          error: [{ message: 'Invalid token', field: 'Authorization' }],
        };
        return res.status(401).json(response);
      }

      if (error.name === 'TokenExpiredError') {
        const response: ApiResponse<null, { message: string; field: string }[]> = {
          status: 'fail',
          message: 'Token expired',
          data: null,
          error: [{ message: 'Token expired', field: 'Authorization' }],
        };
        return res.status(401).json(response);
      }

      // Default error response
      const response: ApiResponse<null, { message: string; field: string }[]> = {
        status: 'fail',
        message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
        data: null,
        error: [{ message: 'Internal server error', field: 'server' }],
      };

      return res.status(500).json(response);
    });
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
