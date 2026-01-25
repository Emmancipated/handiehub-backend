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

@Schema({ timestamps: true })
export class Product {
  // ============ BASIC INFO ============
  @Prop({ required: true })
  name: string;

  @Prop({ unique: true })
  productId: string;

  @Prop()
  shortDescription: string; // Max 200 chars - highlights/features

  @Prop({ required: true })
  description: string;

  @Prop({
    required: true,
    enum: ['product', 'service'],
    type: String,
  })
  type: string;

  // ============ CATEGORIZATION ============
  @Prop()
  category: string; // Category identifier (e.g., "home_kitchen", "electronics")

  @Prop()
  subCategory: string;

  @Prop()
  brand: string; // Brand name or identifier

  @Prop()
  brandName: string; // For unbranded items, use "-"

  // ============ MEDIA ============
  @Prop({ type: [String], default: [] })
  images: string[]; // Min 3, Max 10

  // ============ PRICING ============
  @Prop({ required: true })
  amount: number; // Base price

  @Prop()
  discountedPrice: number; // Optional sale price

  @Prop({
    enum: ['fixed', 'hourly', 'per_project', 'starting_from'],
    default: 'fixed',
    type: String,
  })
  pricingType: string; // For services

  @Prop()
  currency: string; // Default: NGN

  // ============ PRODUCT-SPECIFIC ============
  @Prop()
  quantity: number; // Stock quantity for products

  @Prop({
    enum: ['new', 'used', 'refurbished'],
    type: String,
  })
  condition: string; // For products only

  @Prop()
  weight: number; // Shipping weight in kg

  @Prop()
  model: string;

  @Prop()
  supplierSku: string;

  @Prop()
  color: string;

  // ============ SERVICE-SPECIFIC ============
  @Prop()
  estimatedDuration: number; // Duration in hours (e.g., 24 = 1 day, 48 = 2 days)

  @Prop()
  serviceArea: string; // Location/area covered

  @Prop({ type: [String], default: [] })
  availability: string[]; // Days/times available

  // ============ POLICIES & OPTIONS ============
  @Prop({
    enum: ['no_return', '7_days', '14_days', '30_days'],
    default: '7_days',
    type: String,
  })
  returnPolicy: string;

  @Prop({ default: false })
  hasWarranty: boolean;

  @Prop()
  warrantyDuration: string; // e.g., "6 months", "1 year"

  @Prop()
  warrantyDetails: string;

  // ============ SEO & DISCOVERY ============
  @Prop({ type: [String], index: true, default: [] })
  tags: string[]; // Keywords for search

  @Prop({ unique: true })
  slug: string;

  @Prop()
  sku: string;

  // ============ STATUS & VISIBILITY ============
  @Prop({
    required: true,
    enum: ['draft', 'pending', 'approved', 'declined', 'archived'],
    default: 'pending',
    type: String,
  })
  status: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isFeatured: boolean;

  @Prop()
  declineReason: string; // Reason for rejection when status is 'declined'

  // ============ SELLER INFO ============
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  handieman: User;

  // ============ LEGACY FIELDS ============
  @Prop()
  categoryCode: string;

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
