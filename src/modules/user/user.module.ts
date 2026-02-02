import { forwardRef, Module } from '@nestjs/common';
import { UserService } from './user.service';
import { MongooseModule } from '@nestjs/mongoose';
import { UserController } from './user.controller';
import { User, UserSchema } from './schemas/user.schema';
import { VerificationService } from '../verification/verification.service';
import { EmailService } from '../message/email.service';
import { VerificationModule } from '../verification/verification.module';
import { MessageModule } from '../message/message.module';
import { JwtStrategy } from '../auth/jwt.strategy';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from '../auth/constants';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { UserListener } from './user.listerner';
import { Order, OrderSchema } from '../orders/schema/order.schema';
import { Review, ReviewSchema } from '../review/schema/review.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Review.name, schema: ReviewSchema },
    ]),
    // VerificationModule,
    // MessageModule
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '86400s' },
    }),
    EventEmitterModule,
  ],
  controllers: [UserController],
  providers: [UserService, VerificationService, EmailService, UserListener],
  exports: [
    UserService,
    VerificationService,
    MongooseModule,
    JwtModule,
    EmailService,
  ],
})
export class UserModule { }
