// // import { Injectable, UnprocessableEntityException } from '@nestjs/common';
// // import * as bcrypt from 'bcryptjs';

// // // You can refactor this to support other verifications: password reset, etc

// // @Injectable()
// // export class VerificationService {
// //   // Minimum interval between requests
// //   // Feel free to implement robust throthling/security
// //   private readonly minRequestIntervalMinutes = 1;
// //   private readonly tokenExpirationMinutes = 15;
// //   private readonly saltRounds = 10;

// //   constructor(
// //     @InjectRepository(Verification)
// //     private tokenRepository: Repository<Verification>,
// //   ) {}

// //   async generateOtp(userId: number, size = 6): Promise<string> {
// //     const now = new Date();

// //     // Check if a token was requested too recently
// //     // Feel free to implement robust throthling/security
// //     const recentToken = await this.tokenRepository.findOne({
// //       where: {
// //         userId,
// //         createdAt: MoreThan(
// //           new Date(now.getTime() - this.minRequestIntervalMinutes * 60 * 1000),
// //         ),
// //       },
// //     });

// //     if (recentToken) {
// //       throw new UnprocessableEntityException(
// //         'Please wait a minute before requesting a new token.',
// //       );
// //     }

// //     const otp = generateOtp(size);
// //     const hashedToken = await bcrypt.hash(otp, this.saltRounds);

// //     const tokenEntity = this.tokenRepository.create({
// //       userId,
// //       token: hashedToken,
// //       expiresAt: new Date(
// //         now.getTime() + this.tokenExpirationMinutes * 60 * 1000,
// //       ),
// //     });

// //     // potential issues
// //     await this.tokenRepository.delete({ userId });

// //     await this.tokenRepository.save(tokenEntity);

// //     return otp;
// //   }

// //   async validateOtp(userId: number, token: string): Promise<boolean> {
// //     const validToken = await this.tokenRepository.findOne({
// //       where: { userId, expiresAt: MoreThan(new Date()) },
// //     });

// //     if (validToken && (await bcrypt.compare(token, validToken.token))) {
// //       await this.tokenRepository.remove(validToken);
// //       return true;
// //     } else {
// //       return false;
// //     }
// //   }

// //   async cleanUpExpiredTokens() {}
// // }

// // import { Injectable, UnprocessableEntityException } from '@nestjs/common';
// // import { InjectModel } from '@nestjs/mongoose';
// // import { Model } from 'mongoose';
// // import * as bcrypt from 'bcryptjs';
// // import { Types } from 'mongoose';
// // import { Verification } from './verification.schema';
// // import { generateOtp } from './utils/otp.utils';
// // import { randomUUID, UUID } from 'crypto';
// // import { UserService } from '../user/user.service';

// // @Injectable()
// // export class VerificationService {
// //   // Minimum interval between requests
// //   private readonly minRequestIntervalMinutes = 1;
// //   private readonly tokenExpirationMinutes = 15;
// //   private readonly saltRounds = 10;

// //   constructor(
// //     @InjectModel(Verification.name)
// //     private readonly tokenModel: Model<Verification>,
// //     // @InjectModel(User.name) private userModel: Model<User>,

// //     private usersService: UserService,
// //   ) {}

// //   async generateOtp(userId: Types.ObjectId, size = 6): Promise<string> {
// //     const now = new Date();

// //     // Check if a token was requested too recently
// //     const recentToken = await this.tokenModel.findOne({
// //       userId,
// //       createdAt: {
// //         $gt: new Date(
// //           now.getTime() - this.minRequestIntervalMinutes * 60 * 1000,
// //         ),
// //       },
// //     });

// //     if (recentToken) {
// //       throw new UnprocessableEntityException(
// //         'Please wait a minute before requesting a new token.',
// //       );
// //     }

// //     // Generate OTP and hash it
// //     const otp = generateOtp(size);
// //     const hashedToken = await bcrypt.hash(otp, this.saltRounds);

// //     // Delete any existing tokens for the user
// //     await this.tokenModel.deleteMany({ userId });

// //     // Save the new token with expiration
// //     const tokenEntity = new this.tokenModel({
// //       userId,
// //       token: hashedToken,
// //       expiresAt: new Date(
// //         now.getTime() + this.tokenExpirationMinutes * 60 * 1000,
// //       ),
// //     });

// //     await tokenEntity.save();

// //     return otp;
// //   }

// //   async validateOtp(userId: Types.ObjectId, token: string): Promise<boolean> {
// //     const validToken = await this.tokenModel.findOne({
// //       userId,
// //       expiresAt: { $gt: new Date() },
// //     });

// //     if (validToken && (await bcrypt.compare(token, validToken.token))) {
// //       await this.tokenModel.deleteOne({ _id: validToken._id });
// //       return true;
// //     }

// //     return false;
// //   }

// //   async cleanUpExpiredTokens() {
// //     // Deletes all expired tokens
// //     await this.tokenModel.deleteMany({ expiresAt: { $lt: new Date() } });
// //   }

// //   async createVerificationToken(userId: string) {
// //     const token: UUID = randomUUID();
// //     // const token = uuid(); // alternatively, you could use JWTs here
// //     await this.usersService.saveVerificationToken(userId, token); // Save token in your database
// //     return token;
// //   }
// // }

// import {
//   forwardRef,
//   Inject,
//   Injectable,
//   UnprocessableEntityException,
// } from '@nestjs/common';
// import { InjectModel } from '@nestjs/mongoose';
// import { Model, Types } from 'mongoose';
// import * as bcrypt from 'bcryptjs';
// import { Verification } from './verification.schema';
// import { generateOtp } from './utils/otp.utils';
// import { randomUUID } from 'crypto';
// import { UserService } from '../user/user.service';
// import { User } from '../user/user.schema';

// @Injectable()
// export class VerificationService {
//   private readonly minRequestIntervalMinutes = 1;
//   private readonly tokenExpirationMinutes = 15;
//   private readonly saltRounds = 10;

//   constructor(
//     @InjectModel(Verification.name) private userModel: Model<Verification>,
//     private readonly usersService: UserService,
//   ) {
//     // private tokenRepository: Repository<Verification>,
//     // private readonly usersService: UserService, // private readonly tokenModel: Model<Verification>,
//     // private readonly usersService: UserService, // private readonly tokenModel: Model<Verification>, // @InjectModel(Verification.name)
//   }

//   async generateOtp(userId: Types.ObjectId, size = 6): Promise<string> {
//     const now = new Date();

//     // Check if a token was requested too recently
//     // const recentToken = await this.tokenModel.findOne({
//     //   userId,
//     //   createdAt: {
//     //     $gt: new Date(
//     //       now.getTime() - this.minRequestIntervalMinutes * 60 * 1000,
//     //     ),
//     //   },
//     // });

//     // if (recentToken) {
//     //   throw new UnprocessableEntityException(
//     //     'Please wait a minute before requesting a new token.',
//     //   );
//     // }

//     // Generate OTP and hash it
//     const otp = generateOtp(size);
//     const hashedToken = await bcrypt.hash(otp, this.saltRounds);

//     // Delete any existing tokens for the user
//     // await this.tokenModel.deleteMany({ userId });

//     // // Save the new token with expiration
//     // const tokenEntity = new this.tokenModel({
//     //   userId,
//     //   token: hashedToken,
//     //   expiresAt: new Date(
//     //     now.getTime() + this.tokenExpirationMinutes * 60 * 1000,
//     //   ),
//     // });

//     // await tokenEntity.save();

//     return otp;
//   }

//   async validateOtp(userId: Types.ObjectId, token: string): Promise<boolean> {
//     // const validToken = await this.tokenModel.findOne({
//     //   userId,
//     //   expiresAt: { $gt: new Date() },
//     // });

//     // if (validToken && (await bcrypt.compare(token, validToken.token))) {
//     //   await this.tokenModel.deleteOne({ _id: validToken._id });
//     //   return true;
//     // }

//     return false;
//   }

//   async cleanUpExpiredTokens() {
//     // await this.tokenModel.deleteMany({ expiresAt: { $lt: new Date() } });
//   }
// }

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  HttpStatus,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../user/schemas/user.schema';
import { EmailService } from '../message/email.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { generateOtp } from './utils/otp.utils';

@Injectable()
export class VerificationService {
  constructor(
    @InjectModel('User') private readonly userModel: Model<User>,
    private emailService: EmailService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) { }

  async addVerificationToken(
    userId: Types.ObjectId,
    expirationMinutes: number,
    email: string,
    id: string,
    role: string,
  ) {
    // const verificationToken = uuidv4();

    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + expirationMinutes * 60000); // Expiration in minutes

    const payload = { username: email, sub: id, role: role };
    // { username: user.email, sub: user.id }
    // Generate a JWT token with userId and expiration
    const verificationToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: `3600`,
    });

    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { verificationToken, createdAt, expiresAt },
      { new: true },
    );

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Send verification email
    const mailAddress = {
      name: user.first_name,
      address: user.email,
    };
    await this.sendVerificationEmail(verificationToken, mailAddress);

    return user;
  }

  async sendVerificationEmail(verificationToken: string, mailAddress: any) {
    const verificationUrl = `https://yourdomain.com/auth/verification/confirm-verify?token=${verificationToken}`;
    const message = `Please verify your email by clicking the following link: ${verificationUrl}`;

    // Your email sending logic
    await this.emailService.sendEmail({
      recipients: [mailAddress],
      subject: 'Email Verification',
      html: `<p>Hi,</p><p>You may verify your MyApp account using the following OTP: <br /><span style="font-size:24px; font-weight: 700;">${message}</span></p><p>Regards,<br />MyApp</p>`,
      text: 'Anything',
    });
  }

  async verifyToken(verificationToken: string) {
    const user = await this.userModel.findOne({ verificationToken });
    if (!user) {
      throw new NotFoundException('Invalid verification token');
    }

    const currentTime = new Date();
    if (user.expiresAt && currentTime > user.expiresAt) {
      throw new BadRequestException('Verification token has expired');
    }

    user.accountStatus = 'active';
    user.email_verified = true;
    user.verificationToken = null;
    user.createdAt = null;
    user.expiresAt = null;
    await user.save();

    return { message: 'Account verified successfully.' };
  }

  // async sendOtp(userId: Types.ObjectId) {
  //   const user = await this.userModel.findById(userId);
  //   if (!user) throw new NotFoundException('User not found');

  //   const otp = generateOtp(6);
  //   const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  //   user.otp = otp;
  //   user.otpExpiresAt = otpExpiresAt;
  //   await user.save();

  //   const mailAddress = {
  //     name: user.first_name,
  //     address: user.email,
  //   };

  //   const message = `Your OTP for MyApp is: ${otp}`;

  //   await this.emailService.sendEmail({
  //     recipients: [mailAddress],
  //     subject: 'Your OTP Code',
  //     html: `<p>Hi ${user.first_name},</p><p>Your OTP is: <strong style="font-size:20px;">${otp}</strong></p><p>It will expire in 10 minutes.</p>`,
  //     text: message,
  //   });

  //   return { message: 'OTP sent successfully' };
  // }

  async sendOtp(user: any) {
    // const user = await this.userModel.findOne({ email });
    // if (!user) throw new NotFoundException('User not found');

    const otp = generateOtp(6);
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    try {
      user.otp = otp;
      user.otpExpiresAt = otpExpiresAt;
      await user.save();
      // console.log(user, user.save(), 'sends otp');
      const testingSentMail = await this.emailService.sendEmail({
        recipients: [{ name: user.first_name, address: user?.email }],
        subject: 'Your OTP Code',
        html: `<p>Your OTP is <strong>${otp}</strong>. It expires in 10 minutes.</p>`,
        text: `Your OTP is ${otp}`,
      });
      // console.log(testingSentMail, 'Testing from verifcation sendOtp');
      return { message: 'OTP sent to your email.' };
    } catch (error) {
      return { message: 'Error occurred while sending mail' };
    }
  }

  async verifyOtp(email: string, otp: string) {
    try {
      const user = await this.userModel.findOne({ email });
      if (!user) throw new NotFoundException('User not found');
      // console.log(user, 'from verifyOTP');
      if (!user.otp || !user.otpExpiresAt) {
        throw new BadRequestException('No OTP set for this user');
      }

      if (user.otp !== otp) {
        throw new BadRequestException('Invalid OTP');
      }

      if (new Date() > user.otpExpiresAt) {
        throw new BadRequestException('OTP has expired');
      }

      // Clear OTP fields and mark verified
      user.otp = null;
      user.otpExpiresAt = null;
      user.email_verified = true;
      user.accountStatus = 'active';
      await user.save();

      return {
        statusCode: HttpStatus.OK,
        message: 'OTP verified successfully. Account activated.',
      };
    } catch (error) {
      console.error(error);
    }
  }
}
