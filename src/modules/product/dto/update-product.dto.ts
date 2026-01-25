import { z } from 'zod';

/**
 * Update Product/Service DTO
 * All fields are optional for partial updates
 */
export const updateProductSchema = z.object({
  // Basic Info
  name: z.string().min(3, 'Name must be at least 3 characters').optional(),
  shortDescription: z.string().max(200, 'Short description cannot exceed 200 characters').optional(),
  description: z.string().min(10, 'Description must be at least 10 characters').optional(),
  type: z.enum(['product', 'service']).optional(),

  // Categorization
  category: z.string().optional(),
  subCategory: z.string().optional(),
  brandName: z.string().optional(),

  // Media
  images: z.array(z.string().url('Invalid URL in images')).optional(),

  // Pricing
  amount: z.number().min(0, 'Amount must be a positive number').optional(),
  discountedPrice: z.number().min(0, 'Discounted price must be a positive number').optional(),
  pricingType: z.enum(['fixed', 'hourly', 'per_project', 'starting_from']).optional(),
  currency: z.string().optional(),

  // Product-specific
  quantity: z.number().int().min(0, 'Quantity must be a non-negative integer').optional(),
  condition: z.enum(['new', 'used', 'refurbished']).optional(),
  weight: z.number().min(0, 'Weight must be a positive number').optional(),
  color: z.string().optional(),
  model: z.string().optional(),
  supplierSku: z.string().optional(),

  // Service-specific
  estimatedDuration: z.number().positive('Estimated duration must be a positive number').optional(),
  serviceArea: z.string().optional(),
  availability: z.array(z.string()).optional(),

  // Policies
  returnPolicy: z.enum(['no_return', '7_days', '14_days', '30_days']).optional(),
  hasWarranty: z.boolean().optional(),
  warrantyDuration: z.enum(['none', '30_days', '3_months', '6_months', '1_year', '2_years']).optional(),
  warrantyDetails: z.string().optional(),

  // SEO
  tags: z.array(z.string()).optional(),

  // Status
  status: z.enum(['draft', 'pending', 'approved', 'declined', 'archived']).optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
}).partial();

export type UpdateProductDto = z.infer<typeof updateProductSchema>;
