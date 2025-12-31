import { z } from 'zod';

export const createProductSchema = z
  .object({
    name: z.string().min(1),
    // productId: z.string(),
    amount: z.number(),
    status: z.enum(['pending', 'approved', 'declined']),
    description: z.string(),
    images: z
      .array(z.string().url('Invalid URL in productsImageUrl'))
      .nonempty(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
    // handieman: z.object({
    //   _id: z.string(),
    // }),
    handieman: z.string(),
    category: z.string(),
    categoryCode: z.string(),
    type: z.enum(['product', 'service']),
  })
  .required();

export type CreateProductDto = z.infer<typeof createProductSchema>;
