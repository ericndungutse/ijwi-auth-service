// Generic API response structure
export interface ApiResponse<T> {
  status: 'success' | 'fail';
  message: string;
  data?: T;
  error?: string;
}
