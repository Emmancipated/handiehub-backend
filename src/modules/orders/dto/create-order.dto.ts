import mongoose from 'mongoose';
import { z } from 'zod';

export const createOrderchema = z
  .object({
    productId: z.string().refine((id) => mongoose.Types.ObjectId.isValid(id), {
      message: 'Invalid Product ID',
    }),
    amount: z.number().positive({ message: 'Amount must be greater than 0' }),
    quantity: z.number().int().min(1, { message: 'Quantity must be at least 1' }).default(1),
    status: z.enum([
      'pending', 'new', 'confirmed', 'accepted', 'scheduled', 
      'shipped', 'in_progress', 'delivered', 'completed', 
      'returned', 'arbitration', 'cancelled', 'refunded'
    ]).default('pending'),
    deliveryDate: z.coerce.date(),
    handieman: z.string().refine((id) => mongoose.Types.ObjectId.isValid(id), {
      message: 'Invalid Handieman',
    }),
    // User is optional in the request - it will be set from JWT token by the controller
    user: z.string().refine((id) => mongoose.Types.ObjectId.isValid(id), {
      message: 'Invalid User',
    }).optional(),
    // Payment reference from Paystack - links payment to order
    paymentReference: z.string().optional(),
  });

export type CreateOrderDto = z.infer<typeof createOrderchema>;

// Schema for recording failed payment attempts (admin visibility only)
export const createFailedOrderSchema = z
  .object({
    productId: z.string().refine((id) => mongoose.Types.ObjectId.isValid(id), {
      message: 'Invalid Product ID',
    }),
    amount: z.number().positive({ message: 'Amount must be greater than 0' }),
    quantity: z.number().int().min(1, { message: 'Quantity must be at least 1' }).default(1),
    deliveryDate: z.coerce.date(),
    handieman: z.string().refine((id) => mongoose.Types.ObjectId.isValid(id), {
      message: 'Invalid Handieman',
    }),
    user: z.string().refine((id) => mongoose.Types.ObjectId.isValid(id), {
      message: 'Invalid User',
    }).optional(),
    failureReason: z.string().min(1, { message: 'Failure reason is required' }),
    paymentReference: z.string().optional(),
  });

export type CreateFailedOrderDto = z.infer<typeof createFailedOrderSchema>;
