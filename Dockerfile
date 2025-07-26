# Simplified Dockerfile for ijwi-auth-service - copying local dependencies

FROM node:20-alpine AS production

# Create app directory
WORKDIR /app

# Copy package files first
COPY package*.json ./

# Create non-root user for security first
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001

# Copy the pre-built files directly
COPY dist/ ./dist/

# Install only the runtime dependencies we know are needed
RUN npm init -y && \
    npm install express@^4.21.2 mongoose@^8.16.4 bcrypt@^6.0.0 jsonwebtoken@^9.0.2 nodemailer@^7.0.5 dotenv@^17.2.0

# Change ownership of the app directory to nodeuser
RUN chown -R nodeuser:nodejs /app
USER nodeuser

# Expose the port the app runs on
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); \
    const options = { host: 'localhost', port: 3000, path: '/health', timeout: 2000 }; \
    const request = http.request(options, (res) => { \
      process.exit(res.statusCode === 200 ? 0 : 1); \
    }); \
    request.on('error', () => process.exit(1)); \
    request.end();"

# Start the application
CMD ["node", "dist/server.js"]