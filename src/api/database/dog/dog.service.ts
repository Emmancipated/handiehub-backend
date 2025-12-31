import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Dog } from 'src/api/database/schemas/dog.schema';

@Injectable()
export class DogService {
  constructor(@InjectModel(Dog.name) private dogModel: Model<Dog>) {}

  async findAll(): Promise<Dog[]> {
    Logger.log('This action returns all DOGS');
    return this.dogModel.find();
  }
}
