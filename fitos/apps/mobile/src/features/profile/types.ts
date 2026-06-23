import type { ActivityLevel, FitnessGoal } from '@fitos/shared';

export interface MeResponse {
  user_id: string;
  email: string;
  role: string;
  created_at: string;
  first_name: string | null;
  date_of_birth: string | null;
  gender: 'male' | 'female' | 'other' | null;
  height_cm: number | null;
  activity_level: ActivityLevel | null;
  primary_goal: FitnessGoal | null;
  daily_calorie_target: number | null;
  protein_target_g: number | null;
  carbohydrate_target_g: number | null;
  fat_target_g: number | null;
  tdee: number | null;
  bmr: number | null;
}

export interface UpdateProfileInput {
  firstName?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  heightCm?: number;
  activityLevel?: ActivityLevel;
}

export interface MacroTargetsResponse {
  dailyCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  goal: FitnessGoal;
  tdee: number;
  bmr: number;
}

export interface UpdateProfileResult {
  profile: {
    user_id: string;
    first_name: string;
    date_of_birth: string;
    gender: 'male' | 'female' | 'other' | null;
    height_cm: number;
    activity_level: ActivityLevel;
  };
  goals: MacroTargetsResponse | null;
}

export const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string }[] = [
  { value: 'sedentary', label: 'Sedentary' },
  { value: 'light', label: 'Light' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'active', label: 'Active' },
  { value: 'very_active', label: 'Very Active' },
];

export const GOAL_LABELS: Record<FitnessGoal, string> = {
  lose_fat: 'Lose Fat',
  build_muscle: 'Build Muscle',
  athletic_performance: 'Athletic Performance',
  health_maintenance: 'Health & Maintenance',
};
