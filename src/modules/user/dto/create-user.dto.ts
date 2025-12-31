import { z } from 'zod';

// const roleEnum = z.enum(['user', 'handieman', 'admin']);
// const roleEnum = z
//   .enum(['user', 'handieman', 'admin'])
//   .refine((val) => ['user', 'handieman', 'admin'].includes(val), {
//     message: 'Unrecognized user role',
//   });

const roleEnum = z.union([
  z.string().refine((val) => ['user', 'handieman', 'admin'].includes(val), {
    message: 'Unrecognized user role',
  }),
  z.undefined().refine(() => false, { message: 'Role is required' }),
]);

export const createUserSchema = z
  .object({
    // id: z.number(),
    first_name: z.string(),
    last_name: z.string(),
    email: z.string().email({ message: 'Invalid email address' }),
    password: z
      .string()
      .min(8, 'Password should be at least 8 characters long') // Minimum 8 characters
      .regex(/[A-Z]/, 'Password should contain at least one uppercase letter') // At least one uppercase letter
      .regex(/\d/, 'Password should contain at least one number') // At least one number
      .regex(
        /[!@#$%^&*(),.?":{}|<>]/,
        'Password should contain at least one special character',
      ),
    role: roleEnum,
  })
  .required();

export type CreateUserDto = z.infer<typeof createUserSchema>;
