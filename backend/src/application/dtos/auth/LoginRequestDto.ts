// LoginRequestDto — Input DTO for authentication
// Zod schema validates the request boundary before reaching use cases.
// Decoupled from User entity: no domain imports.

import { z } from 'zod';

export const LoginRequestSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export type LoginRequestDto = z.infer<typeof LoginRequestSchema>;
