import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CatsController } from 'src/controllers/cat.controller';
import { Cat, CatSchema } from 'src/schemas/cat.schema';
import { CatsService } from 'src/services/cats.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Cat.name, schema: CatSchema }])],
  controllers: [CatsController],
  providers: [CatsService],
})
export class CatsModule {}
