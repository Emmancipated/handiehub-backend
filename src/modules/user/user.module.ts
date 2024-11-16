import { forwardRef, Module } from '@nestjs/common';
import { UserService } from './user.service';
import { MongooseModule } from '@nestjs/mongoose';
import { UserController } from './user.controller.';
import { User, UserSchema } from './schemas/user.schema';
import { VerificationService } from '../verification/verification.service';
import { EmailService } from '../message/email.service';
import { VerificationModule } from '../verification/verification.module';
import { MessageModule } from '../message/message.module';
import { JwtStrategy } from '../auth/jwt.strategy';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from '../auth/constants';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    // VerificationModule,
    // MessageModule
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '86400s' },
    }),
  ],
  controllers: [UserController],
  providers: [UserService, VerificationService, EmailService],
  exports: [UserService, VerificationService],
})
export class UserModule {}
