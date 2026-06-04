// ITokenService — Application port for JWT token operations
// Use cases depend on this interface, never on the jsonwebtoken library.
// DIP: infrastructure provides the implementation; application owns the contract.

export interface TokenPayload {
  id: string;
  role: string;
}

export interface ITokenService {
  generate(payload: TokenPayload): string;
  verify(token: string): TokenPayload;
}
