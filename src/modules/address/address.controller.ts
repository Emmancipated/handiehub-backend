import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { AddressService } from './address.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ZodValidationPipe } from 'src/validators/schema-validator-pipe';
import {
  CreateAddressDto,
  createAddressSchema,
  UpdateAddressDto,
  updateAddressSchema,
} from './dto/address.dto';

@Controller('addresses')
@UseGuards(JwtAuthGuard)
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  /**
   * Get all addresses for the current user
   */
  @Get()
  async getMyAddresses(@Request() req: any) {
    return this.addressService.getUserAddresses(req.user.userId);
  }

  /**
   * Get the default address
   */
  @Get('default')
  async getDefaultAddress(@Request() req: any) {
    return this.addressService.getDefaultAddress(req.user.userId);
  }

  /**
   * Get a specific address by ID
   */
  @Get(':id')
  async getAddress(@Request() req: any, @Param('id') id: string) {
    return this.addressService.getAddressById(req.user.userId, id);
  }

  /**
   * Create a new address
   */
  @Post()
  @UsePipes(new ZodValidationPipe(createAddressSchema))
  async createAddress(@Request() req: any, @Body() dto: CreateAddressDto) {
    return this.addressService.createAddress(req.user.userId, dto);
  }

  /**
   * Update an address
   */
  @Patch(':id')
  @UsePipes(new ZodValidationPipe(updateAddressSchema))
  async updateAddress(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressService.updateAddress(req.user.userId, id, dto);
  }

  /**
   * Delete an address
   */
  @Delete(':id')
  async deleteAddress(@Request() req: any, @Param('id') id: string) {
    return this.addressService.deleteAddress(req.user.userId, id);
  }

  /**
   * Set an address as default
   */
  @Patch(':id/default')
  async setDefaultAddress(@Request() req: any, @Param('id') id: string) {
    return this.addressService.setDefaultAddress(req.user.userId, id);
  }
}
