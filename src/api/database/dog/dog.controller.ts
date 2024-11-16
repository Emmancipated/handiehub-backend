import { Controller, Get } from '@nestjs/common';
import { DogService } from './dog.service';
import { Dog } from '../schemas/dog.schema';

@Controller('dogs')
export class DogController {
  constructor(private dogsService: DogService) {}

  @Get()
  async findAll(): Promise<Dog[]> {
    return this.dogsService.findAll();
  }
}
