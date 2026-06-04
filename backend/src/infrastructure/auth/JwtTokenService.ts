// JwtTokenService — Infrastructure implementation of ITokenService
// Wraps jsonwebtoken. Domain errors are thrown so the middleware can map them
// to HTTP 401 responses without coupling to the JWT library.

import jwt from 'jsonwebtoken';
import type { ITokenService, TokenPayload } from '../../application/ports/ITokenService';
import { TokenExpiredError, InvalidTokenError } from '../../domain/errors/AuthErrors';

export class JwtTokenService implements ITokenService {
  constructor(
    private readonly secret: string,
    private readonly expiresIn: string,
  ) {}

  generate(payload: TokenPayload): string {
    return jwt.sign(payload, this.secret, {
      expiresIn: this.expiresIn as jwt.SignOptions['expiresIn'],
    });
  }

  verify(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, this.secret);
      return decoded as TokenPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) throw new TokenExpiredError();
      throw new InvalidTokenError();
    }
  }
}
