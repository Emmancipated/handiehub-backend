import { Module } from '@nestjs/common';
import { HandiemanService } from './handieman.service';
import { HandiemanController } from './handieman.controller';
import { UserService } from '../user/user.service';
import { UserModule } from '../user/user.module';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../user/schemas/user.schema';
import { EmailService } from '../message/email.service';
import { VerificationService } from '../verification/verification.service';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from '../auth/constants';

@Module({
  imports: [
    UserModule,
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '86400s' },
    }),
  ],
  controllers: [HandiemanController],
  providers: [HandiemanService, UserService, EmailService, VerificationService],
  exports: [HandiemanService, UserService],
})
export class HandiemanModule {}
