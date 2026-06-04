// Auth unit tests
// Covers: JwtTokenService (generate + verify), BcryptPasswordService (hash + compare)
// These use real implementations — no mocks needed for infrastructure services.

import { describe, it, expect } from 'vitest';
import { JwtTokenService } from '../infrastructure/auth/JwtTokenService';
import { BcryptPasswordService } from '../infrastructure/auth/BcryptPasswordService';
import { TokenExpiredError, InvalidTokenError } from '../domain/errors/AuthErrors';

const TEST_SECRET = 'test-secret-key-for-unit-tests';

// ── JwtTokenService ───────────────────────────────────────────────────────────

describe('JwtTokenService', () => {
  const service = new JwtTokenService(TEST_SECRET, '1h');

  it('shouldGenerateJWT — returns a 3-segment JWT string', () => {
    const token = service.generate({ id: 'user-1', role: 'ADMIN' });
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  it('shouldGenerateJWT — verify returns original payload', () => {
    const payload = { id: 'user-42', role: 'CLIENT' };
    const token = service.generate(payload);
    const decoded = service.verify(token);
    expect(decoded.id).toBe(payload.id);
    expect(decoded.role).toBe(payload.role);
  });

  it('shouldGenerateJWT — different secrets produce different tokens', () => {
    const service2 = new JwtTokenService('other-secret', '1h');
    const t1 = service.generate({ id: 'u', role: 'CLIENT' });
    const t2 = service2.generate({ id: 'u', role: 'CLIENT' });
    expect(t1).not.toBe(t2);
  });

  it('throws InvalidTokenError for a tampered or malformed token', () => {
    expect(() => service.verify('not.a.valid.jwt')).toThrow(InvalidTokenError);
  });

  it('throws InvalidTokenError when signed with a different secret', () => {
    const foreignService = new JwtTokenService('wrong-secret', '1h');
    const token = foreignService.generate({ id: 'user-1', role: 'ADMIN' });
    expect(() => service.verify(token)).toThrow(InvalidTokenError);
  });

  it('throws TokenExpiredError for a token with 0-second expiry', async () => {
    const shortService = new JwtTokenService(TEST_SECRET, '1ms');
    const token = shortService.generate({ id: 'user-1', role: 'CLIENT' });
    // Wait for the token to expire
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
    expect(() => shortService.verify(token)).toThrow(TokenExpiredError);
  });
});

// ── BcryptPasswordService ─────────────────────────────────────────────────────

describe('BcryptPasswordService', () => {
  const service = new BcryptPasswordService();

  it('shouldValidatePassword — hash returns a different string from plaintext', async () => {
    const plaintext = 'SecurePassword123!';
    const hashed = await service.hash(plaintext);
    expect(hashed).not.toBe(plaintext);
    expect(typeof hashed).toBe('string');
    expect(hashed.length).toBeGreaterThan(20);
  });

  it('shouldValidatePassword — compare returns true for correct password', async () => {
    const plaintext = 'MyP@ssw0rd';
    const hashed = await service.hash(plaintext);
    expect(await service.compare(plaintext, hashed)).toBe(true);
  });

  it('shouldValidatePassword — compare returns false for wrong password', async () => {
    const hashed = await service.hash('correct-horse-battery-staple');
    expect(await service.compare('wrong-password', hashed)).toBe(false);
  });

  it('produces different hashes for the same plaintext (salt randomness)', async () => {
    const plaintext = 'samePassword';
    const hash1 = await service.hash(plaintext);
    const hash2 = await service.hash(plaintext);
    expect(hash1).not.toBe(hash2);
    // But both should be valid
    expect(await service.compare(plaintext, hash1)).toBe(true);
    expect(await service.compare(plaintext, hash2)).toBe(true);
  });
}, 15_000); // bcrypt is intentionally slow; increase timeout
