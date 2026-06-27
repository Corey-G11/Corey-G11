export type FitnessGoal =
  | 'lose_fat'
  | 'build_muscle'
  | 'athletic_performance'
  | 'health_maintenance';

export interface DashboardGoals {
  primaryGoal: FitnessGoal;
  targetWeightKg: number | null;
  dailyCalorieTarget: number;
  proteinTargetG: number;
  carbohydrateTargetG: number;
  fatTargetG: number;
  tdee: number | null;
  bmr: number | null;
}

export interface RecommendedAction {
  title: string;
  message: string;
  suggestedCalorieAdjustment: number;
}

export interface Recommendation {
  id: string;
  generatedAt: string;
  metricSnapshot: Record<string, unknown>;
  recommendedAction: RecommendedAction;
  isAcknowledged: boolean;
  acknowledgedAt: string | null;
}

export interface Feedback {
  id: string;
  recommendationId: string;
  adherenceScore: number;
  subjectiveEnergyScore: number | null;
  userRejectionReason: string | null;
  systemLearnedWeightDelta: number;
}

export interface SubmitFeedbackInput {
  adherenceScore: number;
  subjectiveEnergyScore?: number;
  userRejectionReason?: string;
}

export interface DashboardSnapshot {
  goals: DashboardGoals | null;
  latestWeightKg: number | null;
  weightDeltaKg: number | null;
  todayCalories: number;
  workoutsThisWeek: number;
  latestRecommendation: Recommendation | null;
}

export interface Biometric {
  id: string;
  recordedAt: string;
  weightKg: number;
  bodyFatPercentage: number | null;
  restingHeartRate: number | null;
  sleepDurationMinutes: number | null;
}

export interface CreateBiometricInput {
  weightKg: number;
  bodyFatPercentage?: number;
  restingHeartRate?: number;
  sleepDurationMinutes?: number;
}

export const GOAL_LABELS: Record<FitnessGoal, string> = {
  lose_fat: 'Lose Fat',
  build_muscle: 'Build Muscle',
  athletic_performance: 'Athletic Performance',
  health_maintenance: 'Health Maintenance',
};
