import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Profession, ProfessionSchema } from '../sub-schemas/profession.schema';

export type HandiemanProfileDocument = HydratedDocument<HandiemanProfile>;

@Schema()
export class HandiemanProfile {
  @Prop({ required: true })
  dp_url: string;

  @Prop({ required: true })
  country: string;

  @Prop()
  city: string;

  @Prop({ required: true })
  address: string;

  @Prop({ required: true })
  state: string;

  @Prop({ required: true })
  phoneNumber: string;

  @Prop({ type: [ProfessionSchema], default: [], required: true })
  profession: Profession[];

  @Prop({ type: [String], default: [], required: true })
  productsImageUrl: string[];

  @Prop()
  description: string;

  @Prop({ required: true })
  businessName: string;

  @Prop()
  responseTime: string;

  @Prop()
  isVerified: boolean;

  @Prop()
  isFeatured: boolean;

  @Prop()
  isTopSeller: boolean;

  // @Prop({ type: [String], default: [] })
  // salesHistory: string[]; // Example, replace with actual sales record/type
}

export const HandiemanProfileSchema =
  SchemaFactory.createForClass(HandiemanProfile);
