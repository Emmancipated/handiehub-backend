import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
// import { Model, MongooseError } from 'mongoose';
import { Model, Error as MongooseError } from 'mongoose';
import { User } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { VerificationService } from '../verification/verification.service';
import { EmailService } from '../message/email.service';
import * as bcrypt from 'bcryptjs';
import { stringify } from 'querystring';
import { randomUUID } from 'crypto';
import { UpdateHandiemanDto } from './dto/update-handieman.dto';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    // private verificationTokenService: VerificationService,
    private emailService: EmailService,
    private readonly verificationService: VerificationService,
  ) {}

  async findAll(): Promise<User[]> {
    Logger.log('This action returns all USERS');
    return await this.userModel.find();
  }
  async findById(id: number): Promise<User> {
    const user = await this.userModel.findOne({ id }).exec();
    if (!user) {
      throw new NotFoundException('No user found with the provided ID');
    }
    return user;
  }
  async findOne(email: string): Promise<User | undefined> {
    const user = await this.userModel.findOne({ email }).lean().exec();
    if (!user) {
      throw new NotFoundException('No user found with the provided email');
    }
    return user;
  }

  async createUser(
    createUserDto: CreateUserDto,
  ): Promise<User | { message: string }> {
    const { id, first_name, last_name, email, password, role } = createUserDto;
    try {
      const existingUserByEmail = await this.userModel
        .findOne({
          email: createUserDto.email,
        })
        .lean()
        .exec();
      if (existingUserByEmail) {
        if (!existingUserByEmail.email_verified) {
          throw new BadRequestException(
            'Email is already in use, please verify account',
          );
        }
        throw new BadRequestException('Email is already in use');
      }
      const existingUserById = await this.userModel.findOne({
        id: createUserDto.id,
      });
      if (existingUserById) {
        throw new BadRequestException('ID is already in use');
      }
      // Create new user
      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash(password, salt);

      // const createdUser = new this.userModel(createUserDto);
      const createdUser = new this.userModel({
        id,
        first_name,
        last_name,
        email,
        password: hashedPassword,
        registrationDate: new Date(),
        role: [role],
      });
      await createdUser.save();
      if (createdUser) {
        await this.verificationService.addVerificationToken(
          createdUser._id,
          60,
          email,
          id,
          role,
        );

        return { message: 'User has been created successfully' };
      }
    } catch (error) {
      if (error instanceof MongooseError.ValidationError) {
        this.logger.error(
          `User validation failed: ${JSON.stringify(error.errors)}`,
        );
        // Customize error response for the user
        const userFriendlyMessages = Object.values(error.errors).map((err) => {
          return this.formatValidationMessage(err.path);
        });
        throw new BadRequestException(userFriendlyMessages.join(', '));
      }
      // Log the error and throw a generic error message to the user
      this.logger.error('Unexpected error during user creation', error.stack);
      throw error;
    }
  }

  async verifyUser(verificationToken: string) {
    return await this.verificationService.verifyToken(verificationToken);
  }

  async generateEmailVerification(userId: number) {
    const user = await this.userModel.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.email_verified) {
      throw new UnprocessableEntityException('Account already verified');
    }
  }

  async verifyEmail(userId: number, token: string) {
    const invalidMessage = 'Invalid or expired OTP';

    const user = await this.userModel.findOne({ _id: userId });
    if (!user) {
      throw new UnprocessableEntityException(invalidMessage);
    }

    if (user.email_verified) {
      throw new UnprocessableEntityException('Account already verified');
    }

    // const isValid = await this.verificationTokenService.validateOtp(
    //   user.id,
    //   token,
    // );

    // if (!isValid) {
    //   throw new UnprocessableEntityException(invalidMessage);
    // }

    user.emailVerifiedAt = new Date();
    user.accountStatus = 'active';

    await user.save();

    return true;
  }

  async saveVerificationToken(userId: string, token: string) {
    // Save the token in the database associated with the user
    // return this.userModel.update(userId, { verificationToken: token });
    return this.userModel.findOneAndUpdate(
      { id: userId }, // Query object to find the document
      { verificationToken: token }, // Update object
      { new: true },
    );
  }

  async createVerificationToken(userId: string): Promise<string> {
    const token = randomUUID();
    await this.saveVerificationToken(userId, token);
    return token;
  }

  // Function to format user-friendly error messages
  private formatValidationMessage(field: string): string {
    switch (field) {
      case 'email':
        return 'A valid email address is required.';
      case 'password':
        return 'A password is required and should meet the complexity requirements.';
      case 'first_name':
        return 'First name is required.';
      case 'last_name':
        return 'Last name is required.';
      case 'id':
        return 'invalid id.';
      // Add other cases as needed
      default:
        return `${field} is required.`;
    }
  }

  async handieHubAccountUpdate(
    updateHandiemanDto: UpdateHandiemanDto,
  ): Promise<{ message: string }> {
    const { email } = updateHandiemanDto;
    try {
      await this.userModel.findOneAndUpdate(
        { email }, // Query object to find the document
        { handiemanProfile: updateHandiemanDto }, // Update object
        { new: true },
      );
      return { message: 'Seller has been updated successfully' };
    } catch (error) {
      // Log the error and throw a generic error message to the user
      this.logger.error('Unexpected error during user creation', error.stack);
      throw error;
    }
  }
}
