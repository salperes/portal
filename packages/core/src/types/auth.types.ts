/**
 * Auth Types - Shared between backend and frontend
 */

import type { AuthUser } from './user.types';

// Login isteği
export interface LoginDto {
  username: string;
  password: string;
}

// Login yanıtı
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

// Token refresh yanıtı
export interface RefreshTokenResponse {
  accessToken: string;
}

// JWT Payload
export interface JwtPayload {
  sub: string; // user id
  username: string;
  role: string;
  isAdmin: boolean;
  iat?: number;
  exp?: number;
}
