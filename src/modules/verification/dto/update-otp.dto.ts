import { z } from 'zod';

export const updateOTPSchema = z
  .object({
    email: z.string().email({ message: 'Invalid email address' }),
    otp: z
      .string()
      .regex(/^\d{6}$/, 'OTP must be exactly 6 digits and numeric'),
  })
  .required();

export type UpdateOTPDto = z.infer<typeof updateOTPSchema>;
