import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SkuDocument = HydratedDocument<Sku>;

@Schema()
export class Sku {
  @Prop()
  name: string;

  @Prop({ required: true })
  value: number;
}

export const SkuSchema = SchemaFactory.createForClass(Sku);
