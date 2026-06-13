// Auth use-case unit tests: LoginUseCase + RegisterUseCase
// No real DB, no real JWT library — everything is mocked.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoginUseCase } from '../application/use-cases/auth/LoginUseCase';
import { RegisterUseCase } from '../application/use-cases/auth/RegisterUseCase';
import { User } from '../domain/entities/User';
import { UserRole } from '../domain/enums';
import type { IUserRepository } from '../domain/repositories/IUserRepository';
import type { IPasswordService } from '../application/ports/IPasswordService';
import type { ITokenService } from '../application/ports/ITokenService';
import { InvalidCredentialsError } from '../domain/errors/AuthErrors';
import { UserAlreadyExistsError } from '../domain/errors/UserErrors';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ADMIN = new User('u-admin', 'Admin', 'admin@test.com', 'hashed_pw', UserRole.ADMIN, new Date());
const CLIENT = new User('u-client', 'Client', 'client@test.com', 'hashed_pw', UserRole.CLIENT, new Date());

const buildUserRepo = (partial: Partial<IUserRepository> = {}): IUserRepository =>
  ({
    findById:    vi.fn().mockResolvedValue(null),
    findByEmail: vi.fn().mockResolvedValue(null),
    findAll:     vi.fn().mockResolvedValue([]),
    create:      vi.fn().mockResolvedValue(CLIENT),
    update:      vi.fn().mockResolvedValue(CLIENT),
    ...partial,
  }) as unknown as IUserRepository;

const buildPasswordService = (valid = true): IPasswordService =>
  ({
    hash:    vi.fn().mockResolvedValue('hashed_pw'),
    compare: vi.fn().mockResolvedValue(valid),
  }) as unknown as IPasswordService;

const buildTokenService = (): ITokenService =>
  ({
    generate: vi.fn().mockReturnValue('mock.jwt.token'),
    verify:   vi.fn().mockReturnValue({ id: 'u-admin', role: 'ADMIN' }),
  }) as unknown as ITokenService;

// ── LoginUseCase ──────────────────────────────────────────────────────────────

describe('LoginUseCase', () => {
  const dto = { email: 'admin@test.com', password: 'password123' };

  it('happy path — valid credentials return token and user', async () => {
    const repo    = buildUserRepo({ findByEmail: vi.fn().mockResolvedValue(ADMIN) });
    const pwSvc   = buildPasswordService(true);
    const tokSvc  = buildTokenService();
    const uc      = new LoginUseCase(repo, pwSvc, tokSvc);

    const result  = await uc.execute(dto);

    expect(result.token).toBe('mock.jwt.token');
    expect(result.user.id).toBe(ADMIN.id);
    expect(result.user.email).toBe(ADMIN.email);
    expect(result.user.role).toBe(UserRole.ADMIN);
    expect((result.user as Record<string, unknown>)['password']).toBeUndefined();
    expect(repo.findByEmail).toHaveBeenCalledWith(dto.email);
    expect(pwSvc.compare).toHaveBeenCalledWith(dto.password, ADMIN.password);
    expect(tokSvc.generate).toHaveBeenCalledWith({ id: ADMIN.id, role: ADMIN.role });
  });

  it('not found — user does not exist throws InvalidCredentialsError', async () => {
    const repo   = buildUserRepo({ findByEmail: vi.fn().mockResolvedValue(null) });
    const uc     = new LoginUseCase(repo, buildPasswordService(), buildTokenService());

    await expect(uc.execute(dto)).rejects.toBeInstanceOf(InvalidCredentialsError);
    expect(repo.findByEmail).toHaveBeenCalledWith(dto.email);
  });

  it('wrong password — password mismatch throws InvalidCredentialsError', async () => {
    const repo   = buildUserRepo({ findByEmail: vi.fn().mockResolvedValue(ADMIN) });
    const pwSvc  = buildPasswordService(false);
    const uc     = new LoginUseCase(repo, pwSvc, buildTokenService());

    await expect(uc.execute(dto)).rejects.toBeInstanceOf(InvalidCredentialsError);
    expect(pwSvc.compare).toHaveBeenCalledWith(dto.password, ADMIN.password);
  });

  it('edge — CLIENT role also works', async () => {
    const repo   = buildUserRepo({ findByEmail: vi.fn().mockResolvedValue(CLIENT) });
    const uc     = new LoginUseCase(repo, buildPasswordService(true), buildTokenService());

    const result = await uc.execute({ email: CLIENT.email, password: 'pass' });

    expect(result.user.role).toBe(UserRole.CLIENT);
  });
});

// ── RegisterUseCase ───────────────────────────────────────────────────────────

describe('RegisterUseCase', () => {
  const dto = { name: 'New User', email: 'new@test.com', password: 'securepass' };

  it('happy path — creates CLIENT user and returns token', async () => {
    const newUser = new User('u-new', dto.name, dto.email, 'hashed_pw', UserRole.CLIENT, new Date());
    const repo    = buildUserRepo({
      findByEmail: vi.fn().mockResolvedValue(null),
      create:      vi.fn().mockResolvedValue(newUser),
    });
    const pwSvc   = buildPasswordService();
    const tokSvc  = buildTokenService();
    const uc      = new RegisterUseCase(repo, pwSvc, tokSvc);

    const result  = await uc.execute(dto);

    expect(result.token).toBe('mock.jwt.token');
    expect(result.user.email).toBe(dto.email);
    expect(result.user.role).toBe(UserRole.CLIENT);
    expect(pwSvc.hash).toHaveBeenCalledWith(dto.password);
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: dto.email, role: UserRole.CLIENT }),
    );
  });

  it('already exists — email taken throws UserAlreadyExistsError', async () => {
    const repo = buildUserRepo({ findByEmail: vi.fn().mockResolvedValue(CLIENT) });
    const uc   = new RegisterUseCase(repo, buildPasswordService(), buildTokenService());

    await expect(uc.execute(dto)).rejects.toBeInstanceOf(UserAlreadyExistsError);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('edge — always registers as CLIENT regardless of intent', async () => {
    const newUser = new User('u-x', 'x', 'x@x.com', 'h', UserRole.CLIENT, new Date());
    const repo    = buildUserRepo({
      findByEmail: vi.fn().mockResolvedValue(null),
      create:      vi.fn().mockResolvedValue(newUser),
    });
    const uc = new RegisterUseCase(repo, buildPasswordService(), buildTokenService());

    const result = await uc.execute({ name: 'x', email: 'x@x.com', password: 'pass' });
    expect(result.user.role).toBe(UserRole.CLIENT);
  });
});
