// import { PartialType } from '@nestjs/mapped-types';
// import { CreateHandiemanDto } from './create-handieman.dto';

// export class UpdateHandiemanDto extends PartialType(createUserSchema) {}

import { z } from 'zod';

// Zod schema for Profession
const ProfessionSchema = z.object({
  name: z.string().min(1),
  skills: z.array(z.string().min(1)).nonempty('At least one skill is required'),
});

// Zod schema for HandiemanProfile
const UpdateHandiemanProfileSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  dp_url: z.string().min(5, "Invalid image path"),
  country: z.string().min(2, 'country must be more than two characters'),
  city: z.string().min(2, 'city must be more than two characters').optional(),
  address: z.string().min(2, 'address must be more than two characters'),
  state: z.string().min(2, 'state must be more than two characters'),
  phoneNumber: z.string().min(9),
  profession: z
    .array(ProfessionSchema)
    .nonempty('At least one profession is required'),
  productsImageUrl: z
    .array(z.string().min(5, "Invalid image path"))
    .nonempty(),
  description: z.string().min(10, 'description must be at least 10 characters').optional(),
  bizName: z.string().min(2, 'bizName must be at least 2 characters'),
  businessName: z
    .string()
    .min(2, 'businessName must be more than two characters')
    .optional(),
  // salesHistory: z.array(z.string().nonempty("Sales history item cannot be empty")).optional(),
});

export type UpdateHandiemanDto = z.infer<typeof UpdateHandiemanProfileSchema>;
export type UpdateProfessionDto = z.infer<typeof ProfessionSchema>;

export { ProfessionSchema, UpdateHandiemanProfileSchema };
