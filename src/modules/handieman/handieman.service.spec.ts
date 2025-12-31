import { Test, TestingModule } from '@nestjs/testing';
import { HandiemanService } from './handieman.service';

describe('HandiemanService', () => {
  let service: HandiemanService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HandiemanService],
    }).compile();

    service = module.get<HandiemanService>(HandiemanService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
