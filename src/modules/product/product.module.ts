import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import {
  Brand,
  BrandSchema,
  Category,
  CategorySchema,
  Product,
  ProductSchema,
} from './schema/product.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { SkuService } from '../skucounter/sku.service';
import { SkuModule } from '../skucounter/sku.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Brand.name, schema: BrandSchema },
    ]),
    SkuModule,
  ],
  controllers: [ProductController],
  providers: [ProductService],
  exports: [MongooseModule],
})
export class ProductModule {}
