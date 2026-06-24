// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  pagination?: Pagination;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Request Types
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface DateRangeParams {
  from?: string;
  to?: string;
}

// API Configuration
export interface ApiConfig {
  baseUrl: string;
  timeout?: number;
  headers?: Record<string, string>;
}
