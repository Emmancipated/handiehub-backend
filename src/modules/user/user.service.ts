import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
// import { Model, MongooseError } from 'mongoose';
import { Connection, Model, Error as MongooseError, Types } from 'mongoose';
import { User } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { VerificationService } from '../verification/verification.service';
import { EmailService } from '../message/email.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcryptjs';
import { stringify } from 'querystring';
import { randomUUID } from 'crypto';
import { UpdateHandiemanDto } from './dto/update-handieman.dto';
import { UpdateOTPDto } from '../verification/dto/update-otp.dto';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    // private verificationTokenService: VerificationService,
    private emailService: EmailService,
    private readonly verificationService: VerificationService,
    @InjectConnection() private readonly connection: Connection, // Injected for Transactions
    private readonly eventEmitter: EventEmitter2, // Injected for Event-Driven Architecture
  ) { }

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

  /**
     * Creates a new user with transaction safety and decoupled side effects.
     */
  async createUser(createUserDto: CreateUserDto): Promise<User> {
    const { first_name, last_name, email, password, role } = createUserDto;
    const lowercaseEmail = email.toLowerCase().trim();

    // 1. Preparation: Hash password
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    // 2. Start Transaction (ACID Compliance)
    // This ensures that if we add more DB steps later, they all succeed or fail together.
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const newUser = new this.userModel({
        first_name,
        last_name,
        email: lowercaseEmail,
        password: hashedPassword,
        registrationDate: new Date(),
        role: [role],
      });

      // Pass the session to the save method
      const savedUser = await newUser.save();

      // 3. Decouple Side Effects (The Scalable Way)
      // Instead of waiting for the email service (slow), we emit an event.
      // A separate Listener handles the OTP sending.
      this.eventEmitter.emit('user.created', savedUser);

      // 4. Return the Entity
      // Services should return Data (User). 
      // The Controller is responsible for formatting the JSON response (statusCode, message).
      return savedUser;

    } catch (error) {
      this.handleMongoError(error);
    }
  }

  private handleMongoError(error: any): never {
    // Duplicate Key Error (E.g. Email already exists)
    if (error.code === 11000) {
      if (error.keyPattern?.email) {
        throw new ConflictException('Email is already in use');
      }
      throw new ConflictException('Duplicate entry detected');
    }

    // Validation Errors (E.g. Missing fields, wrong types)
    if (error instanceof MongooseError.ValidationError) {
      const messages = Object.values(error.errors).map((err) => err.message);
      this.logger.warn(`Validation failed: ${messages.join(', ')}`);
      throw new BadRequestException(messages.join(', '));
    }

    // Unexpected Errors
    this.logger.error(`Unexpected error during user creation: ${error.message}`, error.stack);
    throw new InternalServerErrorException('An unexpected error occurred. Please try again later.');
  }

  async resendVerifyUser(
    email: string,
  ): Promise<{ statusCode: number; message: string }> {
    try {
      const existingUserByEmail = await this.userModel
        .findOne({ email: email.toLowerCase() })
        .exec();
      if (existingUserByEmail) {
        if (existingUserByEmail.email_verified) {
          throw new BadRequestException('Email is already verified');
        }
        await this.verificationService.sendOtp(existingUserByEmail);
      }
      return {
        statusCode: HttpStatus.OK,
        message: `Otp has been sent to ${existingUserByEmail.email}, please check your mail`,
      };
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
      this.logger.error('Unexpected error while sending email', error.stack);
      throw error;
    }
  }

  async verifyUser(updateOTPDto: UpdateOTPDto) {
    const { email, otp } = updateOTPDto;
    // return await this.verificationService.verifyToken(verificationToken);
    return await this.verificationService.verifyOtp(email.toLowerCase(), otp);
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

  async upDateNow() {
    const objectId = new Types.ObjectId('674bf687c1b5e11362fc421e'); // Ensure valid ObjectId
    const userd = await this.userModel.findById(objectId);

    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        objectId,
        {
          $set: {
            handiemanProfile: {
              businessName: 'Emmanuel Handieman',
              dp_url:
                'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8ZmFjZXxlbnwwfHwwfHx8MA%3D%3D',
              // dp_url:
              //   'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8ZnVybml0dXJlfGVufDB8fDB8fHww',
            },
          },
        },
        { new: true, upsert: true }, // Creates `handiemanProfile` if missing
      )
      .exec();

    return updatedUser;
  }
}
