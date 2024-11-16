import { ConfigProps } from 'src/common/interfaces/config.interface';

export const config = (): ConfigProps => ({
  port: parseInt(process.env.PORT, 10) || 8080,
  api: {
    // apiUrl: process.env.API_URL,
    httpTimeout: 1000,
  },
  mongodb: {
    database: {
      connectionString:
        process.env.MONGODB_CONNECTION_STRING || 'mongodb://localhost:27017',
      // parseInt(process.env.DATABASE_PORT, 10) || 5432

      databaseName: process.env.DB_NAME || 'handiehubdb',
    },
  },
});
