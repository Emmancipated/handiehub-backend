import {
  Injectable,
  Logger,
  NotFoundException,
  HttpStatus,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Address } from './schema/address.schema';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';

@Injectable()
export class AddressService {
  private readonly logger = new Logger(AddressService.name);

  constructor(
    @InjectModel(Address.name) private addressModel: Model<Address>,
  ) {}

  /**
   * Get all addresses for a user
   */
  async getUserAddresses(userId: string): Promise<any> {
    const addresses = await this.addressModel
      .find({ user: new Types.ObjectId(userId), isActive: true })
      .sort({ isDefault: -1, createdAt: -1 })
      .exec();

    return {
      statusCode: HttpStatus.OK,
      data: addresses.map((addr) => ({
        id: addr._id,
        label: addr.label,
        fullName: addr.fullName,
        phoneNumber: addr.phoneNumber,
        address: addr.address,
        city: addr.city,
        state: addr.state,
        country: addr.country,
        postalCode: addr.postalCode,
        additionalInfo: addr.additionalInfo,
        isDefault: addr.isDefault,
      })),
    };
  }

  /**
   * Get a single address by ID
   */
  async getAddressById(userId: string, addressId: string): Promise<any> {
    const address = await this.addressModel
      .findOne({
        _id: new Types.ObjectId(addressId),
        user: new Types.ObjectId(userId),
        isActive: true,
      })
      .exec();

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    return {
      statusCode: HttpStatus.OK,
      data: {
        id: address._id,
        label: address.label,
        fullName: address.fullName,
        phoneNumber: address.phoneNumber,
        address: address.address,
        city: address.city,
        state: address.state,
        country: address.country,
        postalCode: address.postalCode,
        additionalInfo: address.additionalInfo,
        isDefault: address.isDefault,
      },
    };
  }

  /**
   * Create a new address
   */
  async createAddress(userId: string, dto: CreateAddressDto): Promise<any> {
    // If this is set as default, unset other default addresses
    if (dto.isDefault) {
      await this.addressModel.updateMany(
        { user: new Types.ObjectId(userId) },
        { isDefault: false },
      );
    }

    // Check if this is the first address, make it default
    const existingCount = await this.addressModel.countDocuments({
      user: new Types.ObjectId(userId),
      isActive: true,
    });

    const newAddress = new this.addressModel({
      ...dto,
      user: new Types.ObjectId(userId),
      isDefault: existingCount === 0 ? true : dto.isDefault,
    });

    const savedAddress = await newAddress.save();

    this.logger.log(`Address created for user ${userId}: ${savedAddress._id}`);

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Address created successfully',
      data: {
        id: savedAddress._id,
        label: savedAddress.label,
        fullName: savedAddress.fullName,
        phoneNumber: savedAddress.phoneNumber,
        address: savedAddress.address,
        city: savedAddress.city,
        state: savedAddress.state,
        country: savedAddress.country,
        postalCode: savedAddress.postalCode,
        additionalInfo: savedAddress.additionalInfo,
        isDefault: savedAddress.isDefault,
      },
    };
  }

  /**
   * Update an address
   */
  async updateAddress(
    userId: string,
    addressId: string,
    dto: UpdateAddressDto,
  ): Promise<any> {
    const address = await this.addressModel
      .findOne({
        _id: new Types.ObjectId(addressId),
        user: new Types.ObjectId(userId),
        isActive: true,
      })
      .exec();

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    // If setting as default, unset other default addresses
    if (dto.isDefault) {
      await this.addressModel.updateMany(
        { user: new Types.ObjectId(userId), _id: { $ne: addressId } },
        { isDefault: false },
      );
    }

    const updatedAddress = await this.addressModel
      .findByIdAndUpdate(addressId, { $set: dto }, { new: true })
      .exec();

    this.logger.log(`Address updated: ${addressId}`);

    return {
      statusCode: HttpStatus.OK,
      message: 'Address updated successfully',
      data: {
        id: updatedAddress._id,
        label: updatedAddress.label,
        fullName: updatedAddress.fullName,
        phoneNumber: updatedAddress.phoneNumber,
        address: updatedAddress.address,
        city: updatedAddress.city,
        state: updatedAddress.state,
        country: updatedAddress.country,
        postalCode: updatedAddress.postalCode,
        additionalInfo: updatedAddress.additionalInfo,
        isDefault: updatedAddress.isDefault,
      },
    };
  }

  /**
   * Delete an address (soft delete)
   */
  async deleteAddress(userId: string, addressId: string): Promise<any> {
    const address = await this.addressModel
      .findOne({
        _id: new Types.ObjectId(addressId),
        user: new Types.ObjectId(userId),
        isActive: true,
      })
      .exec();

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    // Soft delete
    await this.addressModel.findByIdAndUpdate(addressId, { isActive: false });

    // If deleted address was default, set another as default
    if (address.isDefault) {
      const anotherAddress = await this.addressModel
        .findOne({
          user: new Types.ObjectId(userId),
          isActive: true,
        })
        .exec();

      if (anotherAddress) {
        anotherAddress.isDefault = true;
        await anotherAddress.save();
      }
    }

    this.logger.log(`Address deleted: ${addressId}`);

    return {
      statusCode: HttpStatus.OK,
      message: 'Address deleted successfully',
    };
  }

  /**
   * Set an address as default
   */
  async setDefaultAddress(userId: string, addressId: string): Promise<any> {
    const address = await this.addressModel
      .findOne({
        _id: new Types.ObjectId(addressId),
        user: new Types.ObjectId(userId),
        isActive: true,
      })
      .exec();

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    // Unset all other defaults
    await this.addressModel.updateMany(
      { user: new Types.ObjectId(userId) },
      { isDefault: false },
    );

    // Set this as default
    address.isDefault = true;
    await address.save();

    this.logger.log(`Default address set: ${addressId}`);

    return {
      statusCode: HttpStatus.OK,
      message: 'Default address updated',
      data: {
        id: address._id,
        isDefault: true,
      },
    };
  }

  /**
   * Get the default address for a user
   */
  async getDefaultAddress(userId: string): Promise<any> {
    const address = await this.addressModel
      .findOne({
        user: new Types.ObjectId(userId),
        isDefault: true,
        isActive: true,
      })
      .exec();

    if (!address) {
      // Return the first active address if no default
      const firstAddress = await this.addressModel
        .findOne({
          user: new Types.ObjectId(userId),
          isActive: true,
        })
        .sort({ createdAt: -1 })
        .exec();

      if (!firstAddress) {
        return {
          statusCode: HttpStatus.OK,
          data: null,
        };
      }

      return {
        statusCode: HttpStatus.OK,
        data: {
          id: firstAddress._id,
          label: firstAddress.label,
          fullName: firstAddress.fullName,
          phoneNumber: firstAddress.phoneNumber,
          address: firstAddress.address,
          city: firstAddress.city,
          state: firstAddress.state,
          country: firstAddress.country,
          postalCode: firstAddress.postalCode,
          additionalInfo: firstAddress.additionalInfo,
          isDefault: firstAddress.isDefault,
        },
      };
    }

    return {
      statusCode: HttpStatus.OK,
      data: {
        id: address._id,
        label: address.label,
        fullName: address.fullName,
        phoneNumber: address.phoneNumber,
        address: address.address,
        city: address.city,
        state: address.state,
        country: address.country,
        postalCode: address.postalCode,
        additionalInfo: address.additionalInfo,
        isDefault: address.isDefault,
      },
    };
  }
}
