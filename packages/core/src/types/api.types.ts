/**
 * API Types - Common API response types
 */

// Sayfalama parametreleri
export interface PaginationParams {
  page?: number;
  limit?: number;
}

// Sayfalı yanıt
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// API Error
export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

// Generic API Response
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
