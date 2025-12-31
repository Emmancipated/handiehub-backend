// import { Module } from '@nestjs/common';
// import { AuthService } from './auth.service';
// import { JwtModule } from '@nestjs/jwt';
// import { AuthController } from './auth.controller';
// import { jwtConstants } from './constants';
// import { UserModule } from 'src/api/database/user/user.module';
// import { PassportModule } from '@nestjs/passport';
// import { LocalStrategy } from './local.strategy';

// @Module({
//   imports: [
//     UserModule,
//     JwtModule.register({
//       global: true,
//       secret: jwtConstants.secret,
//       signOptions: { expiresIn: '60s' },
//     }),
//     PassportModule,
//   ],
//   providers: [AuthService, LocalStrategy],
//   controllers: [AuthController],
//   exports: [AuthService],
// })
// export class AuthModule {}

import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalStrategy } from './local.strategy';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserModule } from 'src/modules/user/user.module';
import { JwtStrategy } from './jwt.strategy';
import { AuthController } from './auth.controller';
import { jwtConstants } from './constants';
import { VerificationModule } from '../verification/verification.module';
import { HandiemanModule } from '../handieman/handieman.module';
import { HandiemanService } from '../handieman/handieman.service';

@Module({
  imports: [
    UserModule,
    HandiemanModule,
    PassportModule,
    JwtModule.register({
      global: true,
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '86400s' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule { }
