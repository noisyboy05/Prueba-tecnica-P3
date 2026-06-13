// LoginResponseDto — Output DTO for authentication
// Never exposes the hashed password. Role is exposed as a plain string for transport.

export interface AuthUserDto {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface LoginResponseDto {
  token: string;
  user: AuthUserDto;
}
