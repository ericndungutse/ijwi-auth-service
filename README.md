# Auth Service

A Node.js authentication service built with Express, TypeScript, and MongoDB.

## Features

- User registration and authentication
- MongoDB integration with Mongoose
- TypeScript for type safety
- Express.js web framework
- Environment-based configuration
- Global error handling
- Health check endpoint
- CORS support
- Graceful shutdown handling
- **Docker support for containerized deployment**
- Production-ready multi-stage builds

## Prerequisites

- Node.js (v22 or higher) **OR** Docker
- MongoDB Atlas account (for cloud database) **OR** local MongoDB instance
- npm or yarn package manager (if not using Docker)

## Setup

1. **Clone and install dependencies:**

   ```bash
   npm install
   ```

2. **Configure environment variables:**

   Update the `.env` file with your MongoDB Atlas connection string:

   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/<database-name>?retryWrites=true&w=majority
   ```

   Replace the placeholders:
   - `<username>`: Your MongoDB Atlas username
   - `<password>`: Your MongoDB Atlas password
   - `<cluster-url>`: Your MongoDB Atlas cluster URL
   - `<database-name>`: Your preferred database name

3. **MongoDB Atlas Setup:**
   - Create a MongoDB Atlas account at https://www.mongodb.com/atlas
   - Create a new cluster
   - Create a database user with read/write permissions
   - Add your IP address to the IP Access List
   - Get your connection string from the "Connect" button

## Running the Application

### Docker (Recommended)

The easiest way to run the application is using Docker:

#### Building the Docker Image

```bash
# Build the Docker image
docker build -t ijwi-auth-service .

# Run the container with environment variables
docker run -d \
  -p 3000:3000 \
  -e MONGODB_URI="your-mongodb-connection-string" \
  -e EMAIL_USER="your-email@example.com" \
  -e EMAIL_PASS="your-email-password" \
  -e JWT_SECRET="your-jwt-secret" \
  --name ijwi-auth-service \
  ijwi-auth-service
```

#### Using Docker Compose (Optional)

For a complete setup with MongoDB, you can create a `docker-compose.yml`:

```yaml
version: '3.8'
services:
  auth-service:
    build: .
    ports:
      - "3000:3000"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/ijwi-auth
      - EMAIL_USER=your-email@example.com
      - EMAIL_PASS=your-email-password
      - JWT_SECRET=your-jwt-secret
    depends_on:
      - mongo
    
  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

volumes:
  mongo_data:
```

Then run:
```bash
docker-compose up -d
```

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm run build
npm start
```

### Available Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run start` - Start the production server
- `npm run dev` - Start development server with hot reload
- `npm run dev:watch` - Start development server with file watching
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run format` - Format code with Prettier
- `npm run test` - Run tests with coverage

### Docker Commands

- `docker build -t ijwi-auth-service .` - Build the Docker image
- `docker run -p 3000:3000 ijwi-auth-service` - Run the container
- `docker-compose up -d` - Run with MongoDB using Docker Compose

## API Endpoints

### Health Check

- **GET** `/health` - Check service health

### Authentication

- **POST** `/api/v1/auth/register` - Register a new user

## Project Structure

```
src/
├── app.ts              # Express application setup
├── server.ts           # Server initialization and startup
├── controllers/        # Request handlers
├── dto/               # Data transfer objects
├── infrastructure/    # Dependency injection container
├── models/            # Database models and types
├── repository/        # Data access layer
├── routes/            # API route definitions
└── services/          # Business logic layer
```

## Environment Variables

| Variable             | Description               | Default                 |
| -------------------- | ------------------------- | ----------------------- |
| `PORT`               | Server port               | `3000`                  |
| `NODE_ENV`           | Environment               | `development`           |
| `MONGODB_URI`        | MongoDB connection string | Required                |
| `DB_NAME`            | Database name             | `accounts`              |
| `JWT_SECRET`         | JWT signing secret        | Required                |
| `JWT_EXPIRES_IN`     | JWT expiration time       | `24h`                   |
| `BCRYPT_SALT_ROUNDS` | Password hashing rounds   | `12`                    |
| `CORS_ORIGIN`        | Allowed CORS origins      | `http://localhost:3000` |

## Error Handling

The application includes comprehensive error handling for:

- Mongoose validation errors
- Duplicate key errors
- JWT authentication errors
- Generic server errors

All errors are returned in a consistent JSON format:

```json
{
  "status": "fail",
  "message": "Error description",
  "data": null
}
```

## Security Features

- Password hashing with bcrypt
- JWT token authentication (ready for implementation)
- CORS protection
- Input validation
- Rate limiting configuration (ready for implementation)

## Development Notes

- The service uses ES modules (type: "module" in package.json)
- TypeScript strict mode is enabled
- The application gracefully handles shutdown signals
- Database connections are automatically managed
- All API responses follow a consistent structure

## Next Steps

To complete the authentication service, consider implementing:

- JWT token generation and validation middleware
- Password reset functionality
- Email verification
- Rate limiting
- Logging framework
- Unit and integration tests
- API documentation with Swagger/OpenAPI

## Troubleshooting

1. **MongoDB Connection Issues:**
   - Verify your connection string in `.env`
   - Check IP whitelist in MongoDB Atlas
   - Ensure database user has proper permissions

2. **Port Already in Use:**
   - Change the `PORT` environment variable
   - Kill the process using the port: `netstat -ano | findstr :3000`

3. **TypeScript Compilation Errors:**
   - Run `npm run build` to see detailed error messages
   - Ensure all dependencies are installed
