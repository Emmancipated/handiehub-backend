import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CatsController } from './controllers/cat.controller';
import { AdminController } from './controllers/admin.controller';
import { CatsService } from './services/cats.service';
import { CatsModule } from './cats/cats.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { config } from './config/config';
// import { DatabaseModule } from './api/database/database.module';
import { DogModule } from './api/database/dog/dog.module';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { VerificationModule } from './modules/verification/verification.module';
import { MessageModule } from './modules/message/message.module';
// mongodb://127.0.0.1:27017/
@Module({
  imports: [
    // CatsModule,
    // MongooseModule.forRoot('mongodb://127.0.0.1:27017/handiehubdb'),
    MongooseModule.forRootAsync({
      imports: [ConfigModule], // Import ConfigModule to access configuration
      inject: [ConfigService], // Inject ConfigService to access configuration
      useFactory: async (configService: ConfigService) => ({
        uri: `${configService.get('mongodb.database.connectionString')}/${configService.get('mongodb.database.databaseName')}`, // Use configuration values
      }),
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config],
    }),
    // DogModule,
    UserModule,
    AuthModule,
    // VerificationModule,
    MessageModule,
    // DatabaseModule,
  ],
  controllers: [AppController, AdminController],
  providers: [AppService],
})
export class AppModule {}
