import { z } from 'zod';

// const roleEnum = z.enum(['user', 'handieman', 'admin']);
// const roleEnum = z
//   .enum(['user', 'handieman', 'admin'])
//   .refine((val) => ['user', 'handieman', 'admin'].includes(val), {
//     message: 'Unrecognized user role',
//   });

const roleEnum = z.union([
  z
    .string()
    .refine((val) => ['user', 'handieman', 'admin'].includes(val), {
      message: 'Unrecognized user role',
    }),
  z.undefined().refine(() => false, { message: 'Role is required' }),
]);

export const createUserSchema = z
  .object({
    id: z.number(),
    first_name: z.string(),
    last_name: z.string(),
    email: z.string(),
    password: z.string(),
    role: roleEnum,
  })
  .required();

export type CreateUserDto = z.infer<typeof createUserSchema>;
