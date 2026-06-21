import type { AuthResponse } from '@fitos/shared';
import { apiPost } from '../../api/client';

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export function register(input: RegisterInput): Promise<AuthResponse> {
  return apiPost<AuthResponse>('/auth/register', input);
}

export function login(input: LoginInput): Promise<AuthResponse> {
  return apiPost<AuthResponse>('/auth/login', input);
}
