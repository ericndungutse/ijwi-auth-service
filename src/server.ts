const { App } = require('./app');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

class Server {
  private app: any;
  private port: number;

  constructor() {
    this.app = new App();
    this.port = parseInt(process.env.PORT || '3000', 10);
  }

  public async start(): Promise<void> {
    try {
      // Connect to database first
      await this.app.connectToDatabase();

      // Start the server
      this.app.getApp().listen(this.port, () => {
        console.log(`🚀 Auth Service is running on port ${this.port}`);
        console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🌐 Health check: http://localhost:${this.port}/health`);
        console.log(`🔐 Auth API: http://localhost:${this.port}/api/v1/auth`);
      });

      // Handle graceful shutdown
      this.setupGracefulShutdown();
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  private setupGracefulShutdown(): void {
    // Handle SIGTERM (deployment termination)
    process.on('SIGTERM', () => {
      console.log('🛑 SIGTERM received. Shutting down gracefully...');
      this.shutdown();
    });

    // Handle SIGINT (Ctrl+C)
    process.on('SIGINT', () => {
      console.log('🛑 SIGINT received. Shutting down gracefully...');
      this.shutdown();
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('💥 Uncaught Exception:', error);
      this.shutdown(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 Unhandled Promise Rejection at:', promise, 'reason:', reason);
      this.shutdown(1);
    });
  }

  private async shutdown(exitCode = 0): Promise<void> {
    try {
      console.log('🔄 Closing database connections...');
      const mongoose = require('mongoose');
      await mongoose.connection.close();
      console.log('✅ Database connections closed');

      console.log('👋 Server shutdown complete');
      process.exit(exitCode);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Create and start the server
const server = new Server();
server.start().catch((error) => {
  console.error('❌ Failed to start application:', error);
  process.exit(1);
});
