import mongoose from 'mongoose';
import { z } from 'zod';

export const createOrderchema = z
  .object({
    productId: z.string(),
    // orderId: z.string(),
    amount: z.number(),
    status: z.enum(['pending', 'completed', 'declined']).default('pending'),
    deliveryDate: z.coerce.date(),
    // handieman: z.object({
    //   _id: z.string(),
    // }),
    // user: z.object({
    //   _id: z.string(),
    // }),
    handieman: z.string().refine((id) => mongoose.Types.ObjectId.isValid(id), {
      message: 'Invalid Handieman',
    }),
    user: z.string().refine((id) => mongoose.Types.ObjectId.isValid(id), {
      message: 'Invalid User',
    }),
  })
  .required();

export type CreateOrderDto = z.infer<typeof createOrderchema>;

// orderDate: z.preprocess((arg) => {
//   if (typeof arg === "string" || arg instanceof Date) return new Date(arg);
//   return arg;
// }, z.date()), // Converts input to a Date object
