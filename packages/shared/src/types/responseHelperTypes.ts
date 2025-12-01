export interface ErrorObject {
  path: string;
  message: string;
}
export interface ResponseHelper<T> {
  isSuccess: boolean;
  data: T;
  message: string;
  error: ErrorObject[] | null;
}
