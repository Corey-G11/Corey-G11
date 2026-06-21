export type CompletionStatus =
  | 'pending'
  | 'completed'
  | 'skipped'
  | 'partially_completed';

export interface Exercise {
  id: string;
  name: string;
  target_muscle_group: string | null;
  equipment_required: string | null;
  video_url: string | null;
}

export interface ScheduledWorkout {
  id: string;
  program_id: string;
  day_number: number;
  name: string;
}

export interface Program {
  id: string;
  user_id: string;
  name: string;
  duration_weeks: number;
  is_active: boolean;
  created_at: string;
  scheduled_workouts: ScheduledWorkout[];
}

export interface WorkoutLog {
  id: string;
  user_id: string;
  scheduled_workout_id: string | null;
  logged_at: string;
  status: CompletionStatus;
  total_duration_minutes: number | null;
  user_notes: string | null;
}

export interface ExerciseLog {
  id: string;
  workout_log_id: string;
  exercise_id: string;
  set_index: number;
  target_reps: number | null;
  actual_reps: number;
  weight_kg: string;
  rpe: string | null;
  is_completed: boolean;
  exercise_name?: string;
}

export interface WorkoutLogDetail extends WorkoutLog {
  exercise_logs: ExerciseLog[];
}

export interface CreateLogInput {
  scheduledWorkoutId?: string;
  status?: CompletionStatus;
  totalDurationMinutes?: number;
  userNotes?: string;
}

export interface CreateSetInput {
  exerciseId: string;
  setIndex: number;
  targetReps?: number;
  actualReps: number;
  weightKg: number;
  rpe?: number;
  isCompleted?: boolean;
}

export interface UpdateLogInput {
  status?: CompletionStatus;
  totalDurationMinutes?: number;
  userNotes?: string;
}
