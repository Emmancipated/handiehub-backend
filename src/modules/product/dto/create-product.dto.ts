import { z } from 'zod';

// Base schema with common fields for both products and services
const baseSchema = z.object({
  // Basic Info
  name: z.string().min(3, 'Name must be at least 3 characters'),
  shortDescription: z.string().max(200, 'Short description must be under 200 characters').optional(),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  type: z.enum(['product', 'service']),

  // Categorization
  category: z.string().optional(),
  subCategory: z.string().optional(),
  brandName: z.string().optional(), // Use "-" for unbranded

  // Media - Allow any string that starts with http(s)://
  images: z
    .array(
      z.string().refine(
        (url) => url.startsWith('http://') || url.startsWith('https://'),
        { message: 'Invalid image URL - must start with http:// or https://' }
      )
    )
    .min(1, 'At least 1 image is required')
    .max(10, 'Maximum 10 images allowed'),

  // Pricing
  amount: z.number().positive('Price must be greater than 0'),
  discountedPrice: z.number().positive().optional(),
  pricingType: z.enum(['fixed', 'hourly', 'per_project', 'starting_from']).optional(),
  currency: z.string().default('NGN'),

  // Policies
  returnPolicy: z.enum(['no_return', '7_days', '14_days', '30_days']).optional(),
  hasWarranty: z.boolean().optional(),
  warrantyDuration: z.string().optional(),
  warrantyDetails: z.string().optional(),

  // SEO
  tags: z.array(z.string()).optional(),

  // Status
  status: z.enum(['draft', 'pending', 'approved', 'declined', 'archived']).default('pending'),
  isActive: z.boolean().default(true),

  // Seller
  handieman: z.string(),

  // Legacy
  categoryCode: z.string().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

// Product-specific fields
const productSpecificSchema = z.object({
  quantity: z.number().int().min(0).optional(),
  condition: z.enum(['new', 'used', 'refurbished']).optional(),
  weight: z.number().positive().optional(),
  model: z.string().optional(),
  supplierSku: z.string().optional(),
  color: z.string().optional(),
});

// Service-specific fields
const serviceSpecificSchema = z.object({
  estimatedDuration: z.number().positive('Estimated duration must be a positive number').optional(),
  serviceArea: z.string().optional(),
  availability: z.array(z.string()).optional(),
});

// Combined schema for products
export const createProductSchema = baseSchema
  .merge(productSpecificSchema)
  .merge(serviceSpecificSchema)
  .refine(
    (data) => {
      // If type is 'product', quantity should be provided
      if (data.type === 'product' && data.quantity === undefined) {
        return true; // Make it optional for now, can be stricter later
      }
      return true;
    },
    { message: 'Quantity is recommended for products' }
  )
  .refine(
    (data) => {
      // Discounted price should be less than regular price
      if (data.discountedPrice && data.discountedPrice >= data.amount) {
        return false;
      }
      return true;
    },
    { message: 'Discounted price must be less than regular price' }
  );

export type CreateProductDto = z.infer<typeof createProductSchema>;

// Simplified schema for quick product creation (minimal fields)
export const quickCreateProductSchema = z.object({
  name: z.string().min(3),
  description: z.string().min(10),
  type: z.enum(['product', 'service']),
  amount: z.number().positive(),
  images: z
    .array(
      z.string().refine(
        (url) => url.startsWith('http://') || url.startsWith('https://'),
        { message: 'Invalid image URL' }
      )
    )
    .min(1),
  handieman: z.string(),
  category: z.string().optional(),
});

export type QuickCreateProductDto = z.infer<typeof quickCreateProductSchema>;
