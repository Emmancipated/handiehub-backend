import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  UsePipes,
} from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './schemas/user.schema';
import { ZodValidationPipe } from 'src/validators/schema-validator-pipe';
import { CreateUserDto, createUserSchema } from './dto/create-user.dto';

@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  async findAll(): Promise<User[]> {
    return this.userService.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: number): Promise<User> {
    try {
      return await this.userService.findById(id);
    } catch (error) {
      throw new NotFoundException('No user found with the provided ID');
    }
  }
}
