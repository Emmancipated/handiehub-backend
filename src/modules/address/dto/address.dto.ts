import { z } from 'zod';

export const createAddressSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  fullName: z.string().min(1, 'Full name is required'),
  phoneNumber: z.string().min(1, 'Phone number is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  country: z.string().default('Nigeria'),
  postalCode: z.string().optional(),
  additionalInfo: z.string().optional(),
  isDefault: z.boolean().optional().default(false),
});

export type CreateAddressDto = z.infer<typeof createAddressSchema>;

export const updateAddressSchema = z.object({
  label: z.string().min(1).optional(),
  fullName: z.string().min(1).optional(),
  phoneNumber: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  additionalInfo: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export type UpdateAddressDto = z.infer<typeof updateAddressSchema>;
