import { Test, TestingModule } from '@nestjs/testing';
import { PaystackController } from './paystack.controller';
import { PaystackService } from './paystack.service';

describe('PaystackController', () => {
  let controller: PaystackController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaystackController],
      providers: [PaystackService],
    }).compile();

    controller = module.get<PaystackController>(PaystackController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
