import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProfessionDocument = Document & Profession;

@Schema()
export class Profession {
  @Prop({ required: true })
  name: string;

  @Prop({ type: [String], required: true })
  skills: string[];
}

export const ProfessionSchema = SchemaFactory.createForClass(Profession);
