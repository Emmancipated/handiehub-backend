import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CreateHandiemanDto } from './dto/create-handieman.dto';
import { UpdateHandiemanDto } from './dto/update-handieman.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from '../user/schemas/user.schema';
import { Model } from 'mongoose';
import { UserService } from '../user/user.service';

@Injectable()
export class HandiemanService {
  private readonly logger = new Logger(HandiemanService.name);
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService,
  ) { }
  create(createHandiemanDto: CreateHandiemanDto) {
    return 'This action adds a new handieman';
  }

  findAll() {
    return `This action returns all handieman`;
  }

  findOne(id: number) {
    return `This action returns a #${id} handieman`;
  }

  update(id: number, updateHandiemanDto: UpdateHandiemanDto) {
    return `This action updates a #${id} handieman`;
  }

  remove(id: number) {
    return `This action removes a #${id} handieman`;
  }

  // async handieHubAccountUpdate(
  //   updateHandiemanDto: UpdateHandiemanDto,
  // ): Promise<{ statusCode: HttpStatus; message: string }> {
  //   const { email } = updateHandiemanDto;
  //   try {
  //     await this.userModel.findOneAndUpdate(
  //       { email }, // Query object to find the document
  //       { handiemanProfile: updateHandiemanDto }, // Update object
  //       { new: true },
  //     );
  //     // return { message: 'Seller has been updated successfully' };
  //     return {
  //       statusCode: HttpStatus.OK,
  //       message: 'Seller has been updated successfully.',
  //     };
  //   } catch (error) {
  //     // Log the error and throw a generic error message to the user
  //     this.logger.error('Unexpected error during user creation', error.stack);
  //     throw error;
  //   }
  // }

  async handieHubAccountUpdate(
    updateHandiemanDto: UpdateHandiemanDto,
  ): Promise<{ statusCode: HttpStatus; message: string; access_token?: string }> {
    const { email, productsImageUrl, bizName, businessName, ...rest } =
      updateHandiemanDto;

    // Check if user is already a handieman/seller
    const existingUser = await this.userModel.findOne({ email }).exec();
    
    if (!existingUser) {
      return {
        statusCode: HttpStatus.NOT_FOUND,
        message: 'User not found. Please sign up first.',
      };
    }

    if (existingUser.role?.includes('handieman')) {
      this.logger.log(`User ${email} is already a handieman/seller`);
      return {
        statusCode: HttpStatus.CONFLICT,
        message: 'You are already registered as a seller. No update needed.',
      };
    }

    // Build profile data object, mapping bizName to businessName
    const profileData: Record<string, any> = { ...rest };
    if (bizName || businessName) {
      profileData.businessName = bizName ?? businessName;
    }

    try {
      // 1. Ensure the handiemanProfile object exists and is not null
      // MongoDB cannot create subfields (e.g., handiemanProfile.address) if the parent is null.
      await this.userModel.updateOne(
        { email, handiemanProfile: null },
        { $set: { handiemanProfile: {} } },
      );

      // 2. Build update object using dot notation to avoid conflicts
      const updateQuery: any = {
        $addToSet: { role: 'handieman' }, // Ensure role exists or add it
      };

      // Build the $set object with dot notation
      const setFields: any = {};
      Object.keys(profileData).forEach((key) => {
        setFields[`handiemanProfile.${key}`] = profileData[key];
      });

      if (Object.keys(setFields).length > 0) {
        updateQuery.$set = setFields;
      }

      // If productsImageUrl exists and is an array, push to existing array
      if (productsImageUrl && Array.isArray(productsImageUrl)) {
        updateQuery.$push = {
          'handiemanProfile.productsImageUrl': {
            $each: productsImageUrl,
          },
        };
      }

      this.logger.log('Update query:', JSON.stringify(updateQuery, null, 2));

      const updatedUser = await this.userModel.findOneAndUpdate({ email }, updateQuery, {
        new: true,
      });

      // Generate a new JWT token with updated role and profile data
      const payload = {
        username: updatedUser.email,
        sub: updatedUser.id,
        role: updatedUser.role,
        first_name: updatedUser.first_name,
        last_name: updatedUser.last_name,
        userId: updatedUser._id.toString(),
        bizName: updatedUser.handiemanProfile?.businessName,
      };

      const access_token = this.jwtService.sign(payload);
      this.logger.log(`New token generated for seller ${email}`);

      return {
        statusCode: HttpStatus.OK,
        message: 'Seller has been updated successfully.',
        access_token,
      };
    } catch (error) {
      this.logger.error('Unexpected error during user update', error.stack);
      throw error;
    }
  }
}
