import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './schemas/user.schema';
import { ZodValidationPipe } from 'src/validators/schema-validator-pipe';
import { CreateUserDto, createUserSchema } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  async findAll(): Promise<User[]> {
    return this.userService.findAll();
  }

  /**
   * Get current authenticated user's profile
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyProfile(@Request() req: any) {
    return this.userService.getProfile(req.user.userId);
  }

  /**
   * Get current user's stats (orders, reviews, etc.)
   */
  @Get('me/stats')
  @UseGuards(JwtAuthGuard)
  async getMyStats(@Request() req: any) {
    return this.userService.getUserStats(req.user.userId);
  }

  /**
   * Update current authenticated user's profile
   */
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateMyProfile(@Request() req: any, @Body() updateData: any) {
    return this.userService.updateProfile(req.user.userId, updateData);
  }

  @Get(':id')
  async findById(@Param('id') id: number): Promise<User> {
    try {
      return await this.userService.findById(id);
    } catch (error) {
      throw new NotFoundException('No user found with the provided ID');
    }
  }

  @Get('/updates/update')
  async upDateNoww() {
    try {
      return await this.userService.upDateNow();
    } catch (error) {
      throw new NotFoundException('No user found with the provided ID');
    }
  }
}
