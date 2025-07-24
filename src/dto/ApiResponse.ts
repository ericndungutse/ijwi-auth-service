// Generic API response structure
export interface ApiResponse<T, E> {
  status: 'success' | 'fail';
  message: string;
  data?: T;
  errors?: E;
}
