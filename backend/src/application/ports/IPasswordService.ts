// IPasswordService — Application port for password hashing
// Use cases depend on this interface, never on bcrypt directly.
// DIP: infrastructure provides the implementation; application owns the contract.

export interface IPasswordService {
  hash(plaintext: string): Promise<string>;
  compare(plaintext: string, hashed: string): Promise<boolean>;
}
