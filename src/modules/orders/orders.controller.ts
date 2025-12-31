import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { createOrderchema, CreateOrderDto } from './dto/create-order.dto';
import { ZodValidationPipe } from 'src/validators/schema-validator-pipe';

@Controller('/api/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('/create')
  create(
    @Body(new ZodValidationPipe(createOrderchema))
    createOrderDto: CreateOrderDto,
  ) {
    return this.ordersService.create(createOrderDto);
  }

  @Get()
  findAll() {
    return this.ordersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(+id);
  }
  @Get('/overview/:id')
  handieManOverview(
    @Param('id') sellerId: string,
    @Query('filter') filter: string = 'all',
  ) {
    return this.ordersService.getHandiemanOverview(sellerId, filter);
  }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
  //   return this.ordersService.update(+id, updateOrderDto);
  // }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ordersService.remove(+id);
  }
}
