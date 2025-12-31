import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Sku, SkuDocument } from './schema/sku.schema';

@Injectable()
export class SkuService {
  constructor(
    @InjectModel(Sku.name) private counterModel: Model<SkuDocument>,
  ) {}

  async getNextSKU(): Promise<string> {
    const counter = await this.counterModel.findOneAndUpdate(
      { name: 'sku' }, // Look for an entry named "sku"
      { $inc: { value: 1 } }, // Increment the counter by 1
      { new: true, upsert: true }, // Create if it doesn't exist
    );

    return counter.value.toString().padStart(3, '0'); // Format as 001, 002, etc.
  }
}
