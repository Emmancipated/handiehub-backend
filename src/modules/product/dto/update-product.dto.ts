import { PartialType } from '@nestjs/mapped-types';
// import { CreateProductDto } from './create-product.dto';

// export class UpdateProductDto extends PartialType(CreateProductDto) {}

import { z } from 'zod';

export const updateProductSchema = z.object({
  // name: z.string().optional(),
  amount: z.number().optional(),
  description: z.string().optional(),
  category: z.string().optional(), // From your schema
  images: z.array(z.string().url('Invalid URL in productsImageUrl')),
});

export type UpdateProductDto = z.infer<typeof updateProductSchema>;
