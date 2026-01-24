import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security
  app.enableCors({
    origin: '*', // TODO: Configure this for production
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204,
    credentials: true,
  });
  app.use(helmet());

  // Enable keep-alive connections to reduce connection overhead
  app.enableShutdownHooks();

  // Capture raw body for the webhook
  app.use(
    '/api/webhook/paystack',
    express.json({
      verify: (req: any, res, buf: Buffer) => {
        req.rawBody = buf.toString(); // Store raw body on request object
      },
    }),
  );
  // ✅ Global JSON parser for normal endpoints
  app.use(bodyParser.json());
  const port = process.env.PORT || 3000;
  await app.listen(port);
}
bootstrap();
// import { NestFactory } from '@nestjs/core';
// import { AppModule } from './app.module';
// import { ConfigService } from '@nestjs/config';
// import { Logger } from '@nestjs/common';
// async function bootstrap() {
//   const app = await NestFactory.create(AppModule);
//   const configService = app.get(ConfigService);
//   const port = configService.get<number>('port');

//   await app.listen(port);
//   Logger.log(`~ Application is running on: ${await app.getUrl()}`);
// }
// bootstrap();

// Use ConfigService in modules
// import { ConfigModule, ConfigService } from '@nestjs/config';

// @Module({
//   imports: [
//     ConfigModule,
//     HttpModule.registerAsync({
//       imports: [ConfigModule],
//       useFactory: async (configService: ConfigService) => ({
//         baseURL: configService.get<string>('api.apiUrl'),
//         timeout: configService.get<number>('api.httpTimeout')
//       }),
//       inject: [ConfigService]
//     })
//   ]
// })

// Using ConfigService in providers
// export const databaseProviders = [
//   {
//     imports: [ConfigModule],
//     provide: 'CONNECTION',
//     useFactory: async (configService: ConfigService): Promise<typeof mongoose> => {
//       const connectionData = {
//         host: configService.get<string>('mongodb.database.connectionString'),
//         databaseName: configService.get<string>('mongodb.database.databaseName')
//       };
//       const connection = await mongoose.connect(`${connectionData.host}`);
//       return connection;
//     },
//     inject: [ConfigService]
//   },
// ];
