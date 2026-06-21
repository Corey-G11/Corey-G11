import { apiDelete, apiGet, apiPost } from '../../api/client';
import type {
  CreateFoodInput,
  CreateLogInput,
  DaySummary,
  Food,
  NutritionLog,
} from './types';

export function searchFoods(query: string, token: string): Promise<Food[]> {
  const q = query.trim();
  const path = q ? `/foods?query=${encodeURIComponent(q)}` : '/foods';
  return apiGet<Food[]>(path, token);
}

export function createFood(
  input: CreateFoodInput,
  token: string,
): Promise<Food> {
  return apiPost<Food>('/foods', input, token);
}

export function createLog(
  input: CreateLogInput,
  token: string,
): Promise<NutritionLog> {
  return apiPost<NutritionLog>('/nutrition/logs', input, token);
}

export function getLogs(date: string, token: string): Promise<NutritionLog[]> {
  return apiGet<NutritionLog[]>(`/nutrition/logs?date=${date}`, token);
}

export function deleteLog(id: string, token: string): Promise<void> {
  return apiDelete<void>(`/nutrition/logs/${id}`, token);
}

export function getSummary(date: string, token: string): Promise<DaySummary> {
  return apiGet<DaySummary>(`/nutrition/summary?date=${date}`, token);
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
