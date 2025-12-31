import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ClientProfileDocument = HydratedDocument<ClientProfile>;

@Schema()
export class ClientProfile {
  @Prop({ required: true })
  address: string;

  @Prop({ type: [String], default: [] })
  orderHistory: string[]; // Example, replace with actual order reference/type
}

export const ClientProfileSchema = SchemaFactory.createForClass(ClientProfile);
