import { apiGet, apiPatch } from '../../api/client';
import type {
  MeResponse,
  UpdateProfileInput,
  UpdateProfileResult,
} from './types';

export function fetchMe(token: string): Promise<MeResponse> {
  return apiGet<MeResponse>('/users/me', token);
}

export function updateProfile(
  token: string,
  input: UpdateProfileInput,
): Promise<UpdateProfileResult> {
  return apiPatch<UpdateProfileResult>('/users/me/profile', input, token);
}
