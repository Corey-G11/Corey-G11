import { apiGet, apiPatch, apiPost } from '../../api/client';
import type {
  Biometric,
  CreateBiometricInput,
  DashboardSnapshot,
  Feedback,
  Recommendation,
  SubmitFeedbackInput,
} from './types';

export function fetchDashboard(token: string): Promise<DashboardSnapshot> {
  return apiGet<DashboardSnapshot>('/dashboard', token);
}

export function fetchBiometrics(
  token: string,
  limit = 30,
): Promise<Biometric[]> {
  return apiGet<Biometric[]>(`/biometrics?limit=${limit}`, token);
}

export function createBiometric(
  token: string,
  input: CreateBiometricInput,
): Promise<Biometric> {
  return apiPost<Biometric>('/biometrics', input, token);
}

export function fetchRecommendations(token: string): Promise<Recommendation[]> {
  return apiGet<Recommendation[]>('/coach/recommendations', token);
}

export function generateRecommendation(token: string): Promise<Recommendation> {
  return apiPost<Recommendation>('/coach/recommendations/generate', {}, token);
}

export function acknowledgeRecommendation(
  token: string,
  id: string,
): Promise<Recommendation> {
  return apiPatch<Recommendation>(
    `/coach/recommendations/${id}/acknowledge`,
    {},
    token,
  );
}

export function submitRecommendationFeedback(
  token: string,
  id: string,
  input: SubmitFeedbackInput,
): Promise<Feedback> {
  return apiPost<Feedback>(
    `/coach/recommendations/${id}/feedback`,
    input,
    token,
  );
}
