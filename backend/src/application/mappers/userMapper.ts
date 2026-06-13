// userMapper — converts domain User entity to auth/user response DTOs
// Never exposes the hashed password in any response shape.

import type { User } from '../../domain/entities/User';
import type { AuthUserDto } from '../dtos/auth/LoginResponseDto';

export const mapUserToAuthDto = (user: User): AuthUserDto => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
});
