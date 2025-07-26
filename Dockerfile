# Dockerfile for ijwi-auth-service
FROM node:20-alpine

# Create app directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001

# Copy package files and pre-built application
COPY package*.json ./
COPY dist/ ./dist/
COPY node_modules/ ./node_modules/

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