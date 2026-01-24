import { BadRequestException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import * as bcrypt from 'bcryptjs';
import { UpdateHandiemanDto } from '../user/dto/update-handieman.dto';
import { VerificationService } from '../verification/verification.service';
import { UpdateOTPDto } from '../verification/dto/update-otp.dto';
import { log } from 'console';
// import {}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UserService,
    private jwtService: JwtService,
    private verificationService: VerificationService,
  ) { }

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findOne(username);
    const isPasswordMatch = await bcrypt.compare(pass, user.password);

    if (!isPasswordMatch) {
      throw new BadRequestException('Incorrect email or password');
    }
    if (!user.email_verified) {
      this.verificationService.sendOtp(username.toLowerCase());
      throw new BadRequestException('Please verify account to continue');
    }

    if (user && isPasswordMatch) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = {
      username: user.email,
      sub: user.id,
      role: user.role,
      first_name: user.first_name,
      last_name: user.last_name,
      userId: user._id.toString(),
      bizName: user.handiemanProfile?.businessName,
    };
    return {
      statusCode: HttpStatus.OK,
      access_token: this.jwtService.sign(payload),
      message: 'Logged in successfully.',
    };
  }

  async signUp(newUser: CreateUserDto): Promise<any> {
    const user = await this.usersService.createUser(newUser);
    return user;
  }

  async verifyAccount(updateOTPDto: UpdateOTPDto): Promise<any> {
    const verification = await this.usersService.verifyUser(updateOTPDto);
    return verification;
  }

  async reverifyAccount(email: string): Promise<any> {
    const verification = await this.usersService.resendVerifyUser(email);
    return verification;
  }
}
