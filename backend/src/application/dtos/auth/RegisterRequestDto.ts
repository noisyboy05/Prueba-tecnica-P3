// RegisterRequestDto — Input DTO for user registration
// Zod schema validates password strength at the application boundary.

import { z } from 'zod';

export const RegisterRequestSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').trim(),
  email: z.string().email('Invalid email format').toLowerCase().trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password is too long'),
});

export type RegisterRequestDto = z.infer<typeof RegisterRequestSchema>;
