import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Verification, VerificationSchema } from './verification.schema';
import { VerificationService } from './verification.service';
import { UserService } from '../user/user.service';
import { UserModule } from '../user/user.module';
import { EmailService } from '../message/email.service';

@Module({
  // imports: [
  //   // MongooseModule.forFeature([
  //   //   { name: Verification.name, schema: VerificationSchema },
  //   // ]),
  //   // UserModule,
  //   forwardRef(() => UserModule),
  // ],

  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}
