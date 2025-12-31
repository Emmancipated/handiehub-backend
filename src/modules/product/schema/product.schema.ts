// // export class Product {}

// import * as mongoose from 'mongoose';
// import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
// import { HydratedDocument } from 'mongoose';
// import { User } from 'src/modules/user/schemas/user.schema';

// export type ProductDocument = HydratedDocument<Product>;

// @Schema()
// export class Product {
//   @Prop()
//   name: string;

//   @Prop()
//   productId: string;

//   @Prop({ required: true })
//   amount: number;

//   @Prop({
//     required: true,
//     enum: ['pending', 'approved', 'declined'],
//     default: 'pending',
//     type: String,
//   })
//   status: string;

//   @Prop({
//     required: true,
//     enum: ['product', 'service'],
//     type: String,
//   })
//   type: string;

//   @Prop()
//   description: string;

//   @Prop()
//   sku: string;

//   @Prop()
//   slug: string;

//   @Prop()
//   images: string[];

//   // @Prop({
//   //   required: true,
//   //   type: Date,
//   // })
//   // deliveryDate: Date;

//   @Prop({
//     required: true,
//     type: Date,
//     default: Date.now,
//   })
//   createdAt: Date;

//   @Prop({
//     required: true,
//     type: Date,
//     default: Date.now,
//   })
//   updatedAt: Date;

//   @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
//   handieman: User;
// }

// export const ProductSchema = SchemaFactory.createForClass(Product);

import * as mongoose from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { User } from 'src/modules/user/schemas/user.schema';

export type ProductDocument = HydratedDocument<Product>;

@Schema()
export class Product {
  @Prop()
  name: string;

  @Prop({ unique: true })
  productId: string;

  @Prop({ required: true })
  amount: number;

  @Prop({
    required: true,
    enum: ['pending', 'approved', 'declined'],
    default: 'pending',
    type: String,
  })
  status: string;

  @Prop({
    required: true,
    enum: ['product', 'service'],
    type: String,
  })
  type: string;

  @Prop()
  description: string;

  @Prop()
  sku: string;

  @Prop({ unique: true })
  slug: string;

  @Prop()
  images: string[];

  @Prop({
    required: true,
    type: Date,
    default: Date.now,
  })
  createdAt: Date;

  @Prop({
    required: true,
    type: Date,
    default: Date.now,
  })
  updatedAt: Date;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  handieman: User;

  /**
   * 🔹 New fields for search functionality
   */

  // To group/search by category (e.g., "Food Processor", "Electronics")
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Category' })
  category: mongoose.Types.ObjectId;

  // To group/search by brand (e.g., "Kenwood", "Samsung")
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Brand' })
  brand: mongoose.Types.ObjectId;

  // For keyword-based search suggestions (extra metadata)
  @Prop({ type: [String], index: true })
  tags: string[];
}

export const ProductSchema = SchemaFactory.createForClass(Product);

/**
 * 🔹 Category Schema
 */
@Schema()
export class Category {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop()
  description: string;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

/**
 * 🔹 Brand Schema
 */
@Schema()
export class Brand {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop()
  description: string;
}

export const BrandSchema = SchemaFactory.createForClass(Brand);
