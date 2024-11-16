import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/modules/user/user.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import * as bcrypt from 'bcryptjs';
import { UpdateHandiemanDto } from '../user/dto/update-handieman.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UserService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findOne(username);
    const isPasswordMatch = await bcrypt.compare(pass, user.password);

    if (user && isPasswordMatch) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { username: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async signUp(newUser: CreateUserDto): Promise<any> {
    const user = await this.usersService.createUser(newUser);
    return user;
  }

  async verifyAccount(verificationToken: string): Promise<any> {
    const verification = await this.usersService.verifyUser(verificationToken);
    return verification;
  }

  async createHandiemanAccount(
    handiemanAcct: UpdateHandiemanDto,
  ): Promise<any> {
    const handiemanItem =
      await this.usersService.handieHubAccountUpdate(handiemanAcct);
    return handiemanItem;
  }
}
