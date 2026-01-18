import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ProductService } from './product.service';
import {
  CreateProductDto,
  createProductSchema,
} from './dto/create-product.dto';
import { ZodValidationPipe } from 'src/validators/schema-validator-pipe';
import {
  UpdateProductDto,
  updateProductSchema,
} from './dto/update-product.dto';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) { }

  @HttpCode(HttpStatus.OK)
  @Post('/create')
  create(
    @Body(new ZodValidationPipe(createProductSchema))
    createProductDto: CreateProductDto,
  ) {
    return this.productService.create(createProductDto);
  }

  // @Get()
  // findAll() {
  //   return this.productService.findAll();
  // }

  @Get()
  async getProducts(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.productService.getProducts(page, limit);
  }
  @Get('search')
  async search(@Query('q') query: string) {
    return this.productService.searchProducts(query);
  }

  @Get('category/:category')
  async getProductsByCategory(
    @Param('category') category: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.productService.getProductsByCategory(category, page, limit);
  }

  @Get(':id/related')
  async getRelatedProducts(
    @Param('id') id: string,
    @Query('limit') limit: number = 4,
  ) {
    return this.productService.getRelatedProducts(id, limit);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productService.findOne(id);
  }
  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.productService.remove(+id);
  // }
}
