import { Module } from '@nestjs/common';
import { SkuService } from './sku.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Sku, SkuSchema } from './schema/sku.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Sku.name, schema: SkuSchema }])],
  providers: [SkuService],
  exports: [SkuService, MongooseModule], // ✅ Export SkuService so other modules can use it
})
export class SkuModule {}
