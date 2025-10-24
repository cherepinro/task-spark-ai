import { Request } from 'express';

/**
 * Authenticated user data
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  isAdmin: boolean;
  hasAIAccess: boolean;
}

/**
 * Authenticated request with user from session
 */
export interface AuthenticatedRequest extends Omit<Request, 'user'> {
  user?: AuthenticatedUser;
}

/**
 * Legacy type for backward compatibility (deprecated)
 */
export interface UserClaims {
  sub: string;
}
