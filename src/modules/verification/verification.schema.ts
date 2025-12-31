// // verification-token.schema.ts
// import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
// import { Document, Types } from 'mongoose';

// @Schema()
// export class Verification extends Document {
//   @Prop({ type: Types.ObjectId, ref: 'User', required: true })
//   userId: Types.ObjectId;

//   @Prop({ required: true })
//   token: string;

//   @Prop({ required: true })
//   expiresAt: Date;

//   @Prop({ default: Date.now })
//   createdAt: Date;
// }

// export const VerificationSchema = SchemaFactory.createForClass(Verification);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Verification extends Document {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  token: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const VerificationSchema = SchemaFactory.createForClass(Verification);
