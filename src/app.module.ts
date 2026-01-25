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
import { OrdersModule } from './modules/orders/orders.module';
import { ProductModule } from './modules/product/product.module';
import { SkuModule } from './modules/skucounter/sku.module';
import { TransactionModule } from './modules/transaction/transaction.module';
import { PaystackModule } from './modules/paystack/paystack.module';
import { ReviewModule } from './modules/review/review.module';
import { CloudinaryModule } from './modules/cloudinary/cloudinary.module';
import { SupabaseModule } from './modules/supabase/supabase.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

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
        // Connection pool optimization to reduce connection latency
        maxPoolSize: 10, // Max number of connections in the pool
        minPoolSize: 2, // Keep minimum connections alive
        serverSelectionTimeoutMS: 5000, // Timeout for server selection
        socketTimeoutMS: 45000, // Socket timeout
        connectTimeoutMS: 10000, // Initial connection timeout
        retryWrites: true,
      }),
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config],
      envFilePath: '.env',
    }),
    EventEmitterModule.forRoot(),
    // DogModule,
    UserModule,
    AuthModule,
    // VerificationModule,
    MessageModule,
    OrdersModule,
    ProductModule,
    SkuModule,
    TransactionModule,
    PaystackModule,
    ReviewModule,
    CloudinaryModule,
    SupabaseModule,
    // DatabaseModule,
  ],
  controllers: [AppController, AdminController],
  providers: [AppService],
})
export class AppModule { }
// envFilePath: ['.env.dev', '.env']
