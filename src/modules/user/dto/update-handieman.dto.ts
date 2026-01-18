import { z } from 'zod';

// Zod schema for Profession
const ProfessionSchema = z.object({
  name: z.string().min(1),
  skills: z.array(z.string().min(1)).nonempty('At least one skill is required'),
});

// Zod schema for HandiemanProfile
const UpdateHandiemanProfileSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  dp_url: z.string().url('Invalid URL for profile image'),
  country: z.string().min(2, 'country must be more than two characters'),
  address: z.string().min(2, 'address must be more than two characters'),
  state: z.string().min(2, 'state must be more than two characters'),
  phoneNumber: z.string().min(9),
  profession: z
    .array(ProfessionSchema)
    .nonempty('At least one profession is required'),
  productsImageUrl: z
    .array(z.string().url('Invalid URL in productsImageUrl'))
    .nonempty(),
  businessName: z.string().min(2, 'businessName must be more than two characters'),
  // salesHistory: z.array(z.string().nonempty("Sales history item cannot be empty")).optional(),
});

export type UpdateHandiemanDto = z.infer<typeof UpdateHandiemanProfileSchema>;
export type UpdateProfessionDto = z.infer<typeof ProfessionSchema>;

export { ProfessionSchema, UpdateHandiemanProfileSchema };
