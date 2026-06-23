import { apiGet, apiPatch, apiPost } from '../../api/client';
import type {
  CreateLogInput,
  CreateSetInput,
  Exercise,
  ExerciseLog,
  Program,
  UpdateLogInput,
  WorkoutLog,
  WorkoutLogDetail,
} from './types';

export function fetchExercises(
  token: string,
  muscle?: string,
): Promise<Exercise[]> {
  const qs = muscle ? `?muscle=${encodeURIComponent(muscle)}` : '';
  return apiGet<Exercise[]>(`/exercises${qs}`, token);
}

export function fetchPrograms(token: string): Promise<Program[]> {
  return apiGet<Program[]>('/workouts/programs', token);
}

export function fetchLogs(token: string): Promise<WorkoutLog[]> {
  return apiGet<WorkoutLog[]>('/workouts/logs', token);
}

export function fetchLog(token: string, id: string): Promise<WorkoutLogDetail> {
  return apiGet<WorkoutLogDetail>(`/workouts/logs/${id}`, token);
}

export function createLog(
  token: string,
  input: CreateLogInput,
): Promise<WorkoutLog> {
  return apiPost<WorkoutLog>('/workouts/logs', input, token);
}

export function addSet(
  token: string,
  logId: string,
  input: CreateSetInput,
): Promise<ExerciseLog> {
  return apiPost<ExerciseLog>(`/workouts/logs/${logId}/sets`, input, token);
}

export function updateLog(
  token: string,
  logId: string,
  input: UpdateLogInput,
): Promise<WorkoutLog> {
  return apiPatch<WorkoutLog>(`/workouts/logs/${logId}`, input, token);
}
