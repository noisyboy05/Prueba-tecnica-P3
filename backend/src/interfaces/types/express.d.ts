// Augments Express Request to carry the authenticated user payload
// populated by the authenticateJWT middleware after token verification.

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
      };
    }
  }
}

export {};
