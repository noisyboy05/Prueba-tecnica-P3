// BcryptPasswordService — Infrastructure implementation of IPasswordService
// Wraps bcryptjs. SALT_ROUNDS = 10 is the recommended minimum for bcrypt.

import bcrypt from 'bcryptjs';
import type { IPasswordService } from '../../application/ports/IPasswordService';

const SALT_ROUNDS = 10;

export class BcryptPasswordService implements IPasswordService {
  async hash(plaintext: string): Promise<string> {
    return bcrypt.hash(plaintext, SALT_ROUNDS);
  }

  async compare(plaintext: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plaintext, hashed);
  }
}
