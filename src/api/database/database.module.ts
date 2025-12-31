import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import database from '../database/constants/database';
import { ConfigModule, ConfigService } from '@nestjs/config';

// @Module({
//   imports: [
//     MongooseModule.forRoot('<YOUR_MONGODB_CONNECTION_STRING>', {
//       dbName: database.DATABASE_NAME,
//     }),
//   ],
//   controllers: [],
//   providers: [],
// })
// export class DatabaseModule {}

// @Module({
//   imports: [
//     MongooseModule.forRootAsync({
//       imports: [ConfigModule],
//       useFactory: async (configService: ConfigService) => ({
//         uri: configService.get<string>('<YOUR_MONGODB_CONNECTION_STRING>'),
//         dbName: database.DATABASE_NAME,
//       }),
//       inject: [ConfigService],
//     }),
//   ],
//   controllers: [],
//   providers: [],
// })
// export class DatabaseModule {}
