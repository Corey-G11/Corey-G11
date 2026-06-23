export type FitnessGoal =
  | 'lose_fat'
  | 'build_muscle'
  | 'athletic_performance'
  | 'health_maintenance';

export type WeightTrend = 'down' | 'up' | 'flat' | 'unknown';

export interface WeightPoint {
  weightKg: number;
  recordedAt: Date;
}

export interface RecommendedAction {
  title: string;
  message: string;
  suggestedCalorieAdjustment: number;
}

// A change smaller than this (kg) over the window is treated as "flat".
const FLAT_THRESHOLD_KG = 0.5;

/**
 * Determine the weight trend from a set of points (any order). Compares the
 * earliest to the latest entry. Returns 'unknown' when there is not enough data.
 */
export function computeWeightTrend(points: WeightPoint[]): WeightTrend {
  if (points.length < 2) return 'unknown';
  const sorted = [...points].sort(
    (a, b) => a.recordedAt.getTime() - b.recordedAt.getTime(),
  );
  const first = sorted[0].weightKg;
  const last = sorted[sorted.length - 1].weightKg;
  const delta = last - first;
  if (Math.abs(delta) < FLAT_THRESHOLD_KG) return 'flat';
  return delta < 0 ? 'down' : 'up';
}

/**
 * Pure rule-based coach. Maps the user's goal + recent weight trend to a
 * recommended calorie adjustment and message. No external AI.
 */
export function buildRecommendedAction(
  goal: FitnessGoal | null,
  trend: WeightTrend,
): RecommendedAction {
  if (goal === 'lose_fat') {
    if (trend === 'down') {
      return {
        title: "You're on track",
        message:
          'Your weight is trending down, which matches your fat-loss goal. Keep your current intake steady.',
        suggestedCalorieAdjustment: 0,
      };
    }
    if (trend === 'up' || trend === 'flat') {
      return {
        title: 'Tighten up your deficit',
        message:
          'Your weight is not trending down. Try reducing your daily intake by about 150 kcal to restart fat loss.',
        suggestedCalorieAdjustment: -150,
      };
    }
  }

  if (goal === 'build_muscle') {
    if (trend === 'up') {
      return {
        title: "You're on track",
        message:
          'Your weight is trending up, supporting muscle growth. Maintain your current intake and training.',
        suggestedCalorieAdjustment: 0,
      };
    }
    if (trend === 'flat' || trend === 'down') {
      return {
        title: 'Add fuel for growth',
        message:
          'Your weight is flat or dropping. Add about 150 kcal per day to support muscle gain.',
        suggestedCalorieAdjustment: 150,
      };
    }
  }

  // athletic_performance, health_maintenance, unknown goal, or unknown trend.
  return {
    title: 'Keep it consistent',
    message:
      'No adjustment needed right now. Stay consistent with your nutrition and training, and log your weight regularly so we can fine-tune your plan.',
    suggestedCalorieAdjustment: 0,
  };
}
