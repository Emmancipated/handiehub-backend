import { Test, TestingModule } from '@nestjs/testing';
import { HandiemanController } from './handieman.controller';
import { HandiemanService } from './handieman.service';

describe('HandiemanController', () => {
  let controller: HandiemanController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HandiemanController],
      providers: [HandiemanService],
    }).compile();

    controller = module.get<HandiemanController>(HandiemanController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
