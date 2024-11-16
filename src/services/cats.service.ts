// import { Injectable } from '@nestjs/common';
// import { Cat } from '../dtos/create-cat.dto';

// @Injectable()
// export class CatsService {
//   private readonly cats: Cat[] = [];

//   create(cat: Cat) {
//     this.cats.push(cat);
//   }

//   findAll(): Cat[] {
//     return this.cats;
//   }
// }

import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cat } from '../schemas/cat.schema';
import { CreateCatDto } from '../dtos/create-cat.dto';

@Injectable()
export class CatsService {
  constructor(@InjectModel(Cat.name) private catModel: Model<Cat>) {}

  async create(createCatDto: CreateCatDto): Promise<Cat> {
    const createdCat = new this.catModel(createCatDto);
    return createdCat.save();
  }

  async findAll(): Promise<Cat[]> {
    return this.catModel.find().exec();
  }
}
