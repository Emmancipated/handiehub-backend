import { z } from 'zod';

export const createSkuSchema = z
  .object({
    name: z.string().min(1),
    value: z.number(),
  })
  .required();

export type CreateSkuDto = z.infer<typeof createSkuSchema>;
