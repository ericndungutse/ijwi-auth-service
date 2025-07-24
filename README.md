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

## Prerequisites

- Node.js (v16 or higher)
- MongoDB Atlas account (for cloud database)
- npm or yarn package manager

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
