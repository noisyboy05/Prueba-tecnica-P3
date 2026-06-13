// RegisterUseCase — creates a new CLIENT user and returns a signed JWT
// SRP: only responsibility is user creation + initial token issuance.
// DIP: depends on IUserRepository, IPasswordService, ITokenService.
// OCP: new registration rules (email verification, referral codes) add new use cases
//      or decorators, without modifying this class.

import type { IUserRepository } from '../../../domain/repositories/IUserRepository';
import type { IPasswordService } from '../../ports/IPasswordService';
import type { ITokenService } from '../../ports/ITokenService';
import type { RegisterRequestDto } from '../../dtos/auth/RegisterRequestDto';
import type { LoginResponseDto } from '../../dtos/auth/LoginResponseDto';
import { UserAlreadyExistsError } from '../../../domain/errors/UserErrors';
import { UserRole } from '../../../domain/enums';
import { mapUserToAuthDto } from '../../mappers/userMapper';

export class RegisterUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordService: IPasswordService,
    private readonly tokenService: ITokenService,
  ) {}

  async execute(dto: RegisterRequestDto): Promise<LoginResponseDto> {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) throw new UserAlreadyExistsError(dto.email);

    const hashedPassword = await this.passwordService.hash(dto.password);

    const user = await this.userRepository.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
      role: UserRole.CLIENT,
    });

    const token = this.tokenService.generate({ id: user.id, role: user.role });

    return { token, user: mapUserToAuthDto(user) };
  }
}
