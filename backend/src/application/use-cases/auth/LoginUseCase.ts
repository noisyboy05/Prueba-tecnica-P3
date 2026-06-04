// LoginUseCase — authenticates a user and returns a signed JWT
// SRP: only responsibility is credential validation + token issuance.
// DIP: depends on IUserRepository, IPasswordService, ITokenService — never on concrete libs.

import type { IUserRepository } from '../../../domain/repositories/IUserRepository';
import type { IPasswordService } from '../../ports/IPasswordService';
import type { ITokenService } from '../../ports/ITokenService';
import type { LoginRequestDto } from '../../dtos/auth/LoginRequestDto';
import type { LoginResponseDto } from '../../dtos/auth/LoginResponseDto';
import { InvalidCredentialsError } from '../../../domain/errors/AuthErrors';
import { mapUserToAuthDto } from '../../mappers/userMapper';

export class LoginUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordService: IPasswordService,
    private readonly tokenService: ITokenService,
  ) {}

  async execute(dto: LoginRequestDto): Promise<LoginResponseDto> {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) throw new InvalidCredentialsError();

    const isValid = await this.passwordService.compare(dto.password, user.password);
    if (!isValid) throw new InvalidCredentialsError();

    const token = this.tokenService.generate({ id: user.id, role: user.role });

    return { token, user: mapUserToAuthDto(user) };
  }
}
