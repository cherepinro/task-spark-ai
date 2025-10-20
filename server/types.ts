import { Request } from 'express';

/**
 * Authenticated request with user claims from Replit Auth
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    claims: {
      sub: string;      // User ID
      email: string;    // User email
      name?: string;    // User name (optional)
    };
  };
}

/**
 * User claims from OIDC token
 */
export interface UserClaims {
  sub: string;      // Subject (user ID)
  email: string;
  name?: string;
  picture?: string; // Avatar URL
  iss?: string;     // Issuer
  aud?: string;     // Audience
  exp?: number;     // Expiration
  iat?: number;     // Issued at
}
