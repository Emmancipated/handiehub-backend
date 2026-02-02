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
import { Order } from '../orders/schema/order.schema';
import { Review } from '../review/schema/review.schema';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(Review.name) private reviewModel: Model<Review>,
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
     * Prevents duplicate email registration - users should update their role instead of creating new accounts.
     */
  async createUser(createUserDto: CreateUserDto): Promise<User> {
    const { first_name, last_name, email, password, role } = createUserDto;
    const lowercaseEmail = email.toLowerCase().trim();

    // Check if user already exists with this email
    const existingUser = await this.userModel.findOne({ email: lowercaseEmail }).exec();
    
    if (existingUser) {
      // If user exists and is trying to sign up as handieman
      if (role === 'handieman') {
        // Check if they're already a handieman
        if (existingUser.role.includes('handieman')) {
          throw new ConflictException(
            'An account with this email already exists and is already registered as a seller/handieman. Please log in instead.',
          );
        }
        // User exists as regular user but wants to become handieman
        throw new ConflictException(
          'An account with this email already exists. Please log in to your existing account and upgrade to a seller account from your profile settings.',
        );
      }
      // Regular signup attempt with existing email
      throw new ConflictException(
        'An account with this email already exists. Please log in or use a different email address.',
      );
    }

    // 1. Preparation: Hash password
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    // 2. Start Transaction (ACID Compliance) - Requires MongoDB Atlas/Replica Set
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

      // Pass the session to the save method for transaction
      const savedUser = await newUser.save({ session });

      // Commit the transaction
      await session.commitTransaction();

      // 3. Decouple Side Effects (The Scalable Way)
      // Instead of waiting for the email service (slow), we emit an event.
      // A separate Listener handles the OTP sending.
      this.eventEmitter.emit('user.created', savedUser);

      this.logger.log(`New user created: ${lowercaseEmail} with role: ${role}`);

      return savedUser;

    } catch (error) {
      // Abort the transaction on error
      await session.abortTransaction();
      this.handleMongoError(error);
    } finally {
      // Always end the session
      session.endSession();
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

  /**
   * Get user profile by ID
   */
  async getProfile(userId: string): Promise<any> {
    const user = await this.userModel
      .findById(userId)
      .select('-password -otp -otpExpiresAt -verificationToken')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      statusCode: HttpStatus.OK,
      data: {
        id: user._id,
        firstName: user.first_name,
        lastName: user.last_name,
        fullName: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        email: user.email,
        emailVerified: user.email_verified,
        accountStatus: user.accountStatus,
        roles: user.role,
        registrationDate: user.registrationDate,
        lastLogin: user.lastLogin,
        // Client profile
        clientProfile: user.clientProfile || null,
        // Seller profile (if handieman)
        handiemanProfile: user.handiemanProfile ? {
          businessName: user.handiemanProfile.businessName,
          profileImage: user.handiemanProfile.dp_url,
          phoneNumber: user.handiemanProfile.phoneNumber,
          country: user.handiemanProfile.country,
          state: user.handiemanProfile.state,
          city: user.handiemanProfile.city,
          address: user.handiemanProfile.address,
          description: user.handiemanProfile.description,
          profession: user.handiemanProfile.profession,
          isVerified: user.handiemanProfile.isVerified,
          isFeatured: user.handiemanProfile.isFeatured,
          isTopSeller: user.handiemanProfile.isTopSeller,
        } : null,
        isHandieman: user.role.includes('handieman'),
        isAdmin: user.role.includes('admin'),
      },
    };
  }

  /**
   * Get user stats (orders, reviews, etc.)
   */
  async getUserStats(userId: string): Promise<any> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isHandieman = user.role.includes('handieman');

    // Count orders (as buyer)
    const buyerOrdersCount = await this.orderModel.countDocuments({
      user: new Types.ObjectId(userId),
      status: { $ne: 'payment_failed' },
    }).exec();

    // Count completed orders as buyer
    const completedBuyerOrders = await this.orderModel.countDocuments({
      user: new Types.ObjectId(userId),
      status: 'completed',
    }).exec();

    // Count reviews written by user
    const reviewsWritten = await this.reviewModel.countDocuments({
      user: new Types.ObjectId(userId),
    }).exec();

    // Base stats for all users
    const stats: any = {
      orders: buyerOrdersCount,
      completedOrders: completedBuyerOrders,
      reviewsWritten: reviewsWritten,
    };

    // Add seller-specific stats if user is a handieman
    if (isHandieman) {
      // Count orders as seller
      const sellerOrdersCount = await this.orderModel.countDocuments({
        handieman: new Types.ObjectId(userId),
        status: { $ne: 'payment_failed' },
      }).exec();

      // Count completed orders as seller
      const completedSellerOrders = await this.orderModel.countDocuments({
        handieman: new Types.ObjectId(userId),
        status: 'completed',
      }).exec();

      // Count reviews received
      const reviewsReceived = await this.reviewModel.countDocuments({
        handieman: new Types.ObjectId(userId),
      }).exec();

      // Calculate average rating
      const ratingAgg = await this.reviewModel.aggregate([
        { $match: { handieman: new Types.ObjectId(userId) } },
        { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
      ]).exec();

      const avgRating = ratingAgg.length > 0 ? ratingAgg[0].avgRating : 0;

      // Total revenue (from completed orders)
      const revenueAgg = await this.orderModel.aggregate([
        { 
          $match: { 
            handieman: new Types.ObjectId(userId),
            status: 'completed',
          } 
        },
        { $group: { _id: null, totalRevenue: { $sum: '$amount' } } },
      ]).exec();

      const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].totalRevenue : 0;

      stats.sellerStats = {
        totalOrders: sellerOrdersCount,
        completedOrders: completedSellerOrders,
        reviewsReceived: reviewsReceived,
        averageRating: Math.round(avgRating * 10) / 10,
        totalRevenue: totalRevenue,
      };
    }

    return {
      statusCode: HttpStatus.OK,
      data: stats,
    };
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updateData: any): Promise<any> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const allowedFields = ['first_name', 'last_name'];
    const updateObj: any = {};

    // Update basic fields
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        updateObj[field] = updateData[field];
      }
    }

    // Update client profile
    if (updateData.clientProfile) {
      updateObj.clientProfile = {
        ...user.clientProfile,
        ...updateData.clientProfile,
      };
    }

    // Update handieman profile (if user is a handieman)
    if (updateData.handiemanProfile && user.role.includes('handieman')) {
      const handiemanFields = [
        'businessName', 'dp_url', 'phoneNumber', 'country', 'state', 
        'city', 'address', 'description', 'profession', 'responseTime'
      ];
      
      const handiemanUpdate: any = {};
      for (const field of handiemanFields) {
        if (updateData.handiemanProfile[field] !== undefined) {
          handiemanUpdate[`handiemanProfile.${field}`] = updateData.handiemanProfile[field];
        }
      }
      
      Object.assign(updateObj, handiemanUpdate);
    }

    if (Object.keys(updateObj).length === 0) {
      return {
        statusCode: HttpStatus.OK,
        message: 'No changes to update',
        data: null,
      };
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(userId, { $set: updateObj }, { new: true })
      .select('-password -otp -otpExpiresAt -verificationToken')
      .exec();

    this.logger.log(`Profile updated for user ${userId}`);

    return {
      statusCode: HttpStatus.OK,
      message: 'Profile updated successfully',
      data: {
        id: updatedUser._id,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        fullName: `${updatedUser.first_name || ''} ${updatedUser.last_name || ''}`.trim(),
        email: updatedUser.email,
      },
    };
  }
}
