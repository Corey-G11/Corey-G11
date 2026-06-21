export type UserRole = 'free' | 'pro' | 'elite' | 'admin';

export type FitnessGoal =
  | 'lose_fat'
  | 'build_muscle'
  | 'athletic_performance'
  | 'health_maintenance';

export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'very_active';

export interface OnboardingData {
  firstName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  primaryGoal: FitnessGoal;
  targetWeightKg?: number;
  trainingDaysPerWeek: number;
  sessionMinutes: 30 | 45 | 60 | 90;
  injuries: string[];
  foodLikes: string[];
  foodDislikes: string[];
  dietaryRules: string[];
}

export interface MacroTargets {
  dailyCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  goal: FitnessGoal;
  tdee: number;
  bmr: number;
}

export interface AuthResponse {
  accessToken: string;
  userId: string;
}

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};
