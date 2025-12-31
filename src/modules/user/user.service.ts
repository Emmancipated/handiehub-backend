import {
  BadRequestException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
// import { Model, MongooseError } from 'mongoose';
import { Model, Error as MongooseError, Types } from 'mongoose';
import { User } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { VerificationService } from '../verification/verification.service';
import { EmailService } from '../message/email.service';
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

  async createUser(
    createUserDto: CreateUserDto,
  ): Promise<User | { statusCode: number; message: string }> {
    const { first_name, last_name, email, password, role } = createUserDto;
    const lowercaseEmail = email.toLowerCase();
    try {
      // const existingUserByEmail = await this.userModel
      //   .findOne({
      //     email: lowercaseEmail,
      //   })
      //   .lean()
      //   .exec();
      // Removed race-condition prone check. Database unique index will handle this.
      // Create new user
      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash(password, salt);
      const userId = randomUUID();

      // const existingUserById = await this.userModel.findOne({
      //   id: userId,
      // });
      // if (existingUserById) {
      //   throw new BadRequestException('ID is already in use');
      // }
      // const createdUser = new this.userModel(createUserDto);
      const createdUser = new this.userModel({
        id: userId,
        first_name,
        last_name,
        email: lowercaseEmail,
        password: hashedPassword,
        registrationDate: new Date(),
        role: [role],
      });
      await createdUser.save();
      if (createdUser) {
        // await this.verificationService.addVerificationToken(
        //   createdUser._id,
        //   60,
        //   lowercaseEmail,
        //   userId,
        //   role,
        // );
        await this.verificationService.sendOtp(createdUser);

        return {
          statusCode: HttpStatus.OK,
          message: 'User has been created successfully',
        };
      }
    } catch (error) {
      if (error.code === 11000) {
        // Check if it's an email duplicate
        if (error.keyPattern && error.keyPattern.email) {
          // We can try to find the user to check if verified (optional, but risky for race condition again)
          // Ideally, just tell user email is taken.
          // If we want to support the "resend OTP if unverified" flow, we need a better approach or accept the race condition for that specific edge case.
          // For now, let's just throw generic error or specific if we can identify.
          throw new BadRequestException('Email is already in use');
        }
        throw new BadRequestException('Duplicate entry');
      }
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

  // async createUser(
  //   createUserDto: CreateUserDto,
  // ): Promise<{ statusCode: number; message: string }> {
  //   const { first_name, last_name, email, password, role } = createUserDto;
  //   const lowercaseEmail = email.toLowerCase();

  //   try {
  //     // Check if user already exists by email
  //     const existingUser = await this.userModel
  //       .findOne({ email: lowercaseEmail })
  //       .exec();

  //     if (existingUser) {
  //       if (!existingUser.email_verified) {
  //         // Send OTP only once, avoid repeated sends on every call
  //         const tokenSent =
  //           await this.verificationService.sendOtp(existingUser);
  //         if (tokenSent) {
  //           this.logger.log(`OTP sent to unverified user: ${lowercaseEmail}`);
  //         }

  //         throw new BadRequestException(
  //           'Email is already in use, please verify account',
  //         );
  //       }

  //       // User exists and is verified
  //       throw new BadRequestException('Email is already in use');
  //     }

  //     // Proceed to create new user
  //     const salt = await bcrypt.genSalt();
  //     const hashedPassword = await bcrypt.hash(password, salt);
  //     const userId = randomUUID();

  //     const newUser = new this.userModel({
  //       id: userId,
  //       first_name,
  //       last_name,
  //       email: lowercaseEmail,
  //       password: hashedPassword,
  //       registrationDate: new Date(),
  //       role: [role],
  //     });

  //     await newUser.save();

  //     await this.verificationService.sendOtp(newUser);

  //     return {
  //       statusCode: HttpStatus.OK,
  //       message: 'User has been created successfully',
  //     };
  //   } catch (error) {
  //     if (error instanceof MongooseError.ValidationError) {
  //       this.logger.error(
  //         `User validation failed: ${JSON.stringify(error.errors)}`,
  //       );

  //       const messages = Object.values(error.errors).map((err) =>
  //         this.formatValidationMessage(err.path),
  //       );

  //       throw new BadRequestException(messages.join(', '));
  //     }

  //     this.logger.error('Unexpected error during user creation', error.stack);
  //     throw error;
  //   }
  // }

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
