// Generic API response structure
export interface ApiResponse<T> {
  success: 'success' | 'failure';
  message: string;
  data?: T;
  error?: string;
}
