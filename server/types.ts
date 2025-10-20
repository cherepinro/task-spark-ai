import { Request } from 'express';

/**
 * User claims from OIDC token
 */
export interface UserClaims {
  sub: string;      // Subject (user ID)
  email: string;
  name?: string;
  picture?: string; // Avatar URL
  first_name?: string;
  last_name?: string;
  profile_image_url?: string;
  iss?: string;     // Issuer
  aud?: string;     // Audience
  exp?: number;     // Expiration
  iat?: number;     // Issued at
}

/**
 * Authenticated request with user claims from Replit Auth
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    claims?: UserClaims;
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
  };
}
