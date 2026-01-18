// import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
// import { AuthService } from './auth.service';

// @Controller('auth')
// export class AuthController {
//   constructor(private authService: AuthService) {}

//   @HttpCode(HttpStatus.OK)
//   @Post('login')
//   signIn(@Body() signInDto: Record<string, any>) {
//     return this.authService.signIn(signInDto.username, signInDto.password);
//   }
// }

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Request,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { CreateUserDto, createUserSchema } from '../user/dto/create-user.dto';
import { ZodValidationPipe } from 'src/validators/schema-validator-pipe';
import { LocalAuthGuard } from './local-auth.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import {
  UpdateHandiemanDto,
  UpdateHandiemanProfileSchema,
} from '../handieman/dto/update-handieman.dto';
import { HandiemanService } from '../handieman/handieman.service';
import {
  UpdateOTPDto,
  updateOTPSchema,
} from '../verification/dto/update-otp.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private handiemanService: HandiemanService,
  ) { }

  // @HttpCode(HttpStatus.OK)
  // @Post('login')
  // signIn(@Body() signInDto: Record<string, any>) {
  //   return this.authService.signIn(signInDto.username, signInDto.password);
  // }

  // @UseGuards(AuthGuard)
  // @Get('profile')
  // getProfile(@Request() req) {
  //   return req.user;
  // }

  // @HttpCode(HttpStatus.OK)
  // @Post('sign-up')
  // async createUser(@Body() createUserDto: CreateUserDto) {
  //   this.authService.signUp(createUserDto);
  // }

  @HttpCode(HttpStatus.OK)
  @Post('sign-up')
  async signUp(
    @Body(new ZodValidationPipe(createUserSchema)) createUserDto: CreateUserDto,
  ) {
    await this.authService.signUp(createUserDto);
    return { statusCode: 201, message: 'User created successfully' };
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  // @Get('verify')
  // verifyUser(@Query('token') token: string) {
  //   return this.authService.verifyAccount(token);
  // }

  @Post('verify')
  verifyUser(
    @Body(new ZodValidationPipe(updateOTPSchema)) updateOTPDto: UpdateOTPDto,
  ) {
    return this.authService.verifyAccount(updateOTPDto);
  }
  @Get('resend-verification')
  resendverifyUser(@Query('email') email: string) {
    return this.authService.reverifyAccount(email);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  // @HttpCode(HttpStatus.OK)
  // @Post('handieman/update-account')
  // async updateHandieman(
  //   @Body(new ZodValidationPipe(UpdateHandiemanProfileSchema))
  //   updateHandiemanDto: UpdateHandiemanDto,
  // ) {
  //   return this.authService.createHandiemanAccount(updateHandiemanDto);
  // }

  @HttpCode(HttpStatus.OK)
  @Post('handieman/update-account')
  async updateHandieman(
    @Body(new ZodValidationPipe(UpdateHandiemanProfileSchema))
    updateHandiemanDto: UpdateHandiemanDto,
  ) {
    return this.handiemanService.handieHubAccountUpdate(updateHandiemanDto);
  }
}
