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

// Bounds for the learned aggressiveness delta produced by a feedback event.
const DELTA_MIN = -1;
const DELTA_MAX = 1;

// Multiplier bounds applied to a base calorie adjustment once learning is
// folded in: never erase an adjustment entirely, never more than 1.5x it.
const MULTIPLIER_MIN = 0.25;
const MULTIPLIER_MAX = 1.5;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** One user feedback event distilled into the signals the coach learns from. */
export interface FeedbackSignal {
  /** How closely the user followed the recommendation, 0..1. */
  adherenceScore: number;
  /** Self-reported energy on a 1..5 scale, or null if not provided. */
  subjectiveEnergyScore: number | null;
  /** Whether the user explicitly rejected the recommendation. */
  hasRejection: boolean;
}

/**
 * Learn an adjustment to the coach's future aggressiveness from a single
 * feedback event. The result is in [-1, 1]:
 *
 *   negative → the plan was too aggressive (poor adherence, low energy, or an
 *              explicit rejection), so future suggestions should be gentler.
 *   positive → the user tolerated the plan well, so the coach can push a little
 *              harder next time.
 */
export function computeLearnedWeightDelta(signal: FeedbackSignal): number {
  let delta = 0;

  // Adherence: below 0.5 dampens proportionally; 0.8+ earns a small reward.
  if (signal.adherenceScore < 0.5) {
    delta -= 0.5 - signal.adherenceScore; // up to -0.5
  } else if (signal.adherenceScore >= 0.8) {
    delta += 0.15;
  }

  // Subjective energy: a taxing plan shows up as low energy.
  if (signal.subjectiveEnergyScore !== null) {
    if (signal.subjectiveEnergyScore <= 2) {
      delta -= 0.2;
    } else if (signal.subjectiveEnergyScore >= 4) {
      delta += 0.05;
    }
  }

  // An explicit rejection is the strongest "back off" signal.
  if (signal.hasRejection) {
    delta -= 0.25;
  }

  return Number(clamp(delta, DELTA_MIN, DELTA_MAX).toFixed(2));
}

/**
 * Fold an accumulated learned factor (the average of recent learned deltas)
 * into a base calorie adjustment. A zero base or zero factor is a no-op. The
 * sign of the adjustment is preserved; only its magnitude is scaled, and the
 * result is rounded to the nearest 5 kcal for a clean target.
 */
export function applyLearning(
  baseAdjustment: number,
  learnedFactor: number,
): number {
  if (baseAdjustment === 0 || learnedFactor === 0) return baseAdjustment;
  const multiplier = clamp(1 + learnedFactor, MULTIPLIER_MIN, MULTIPLIER_MAX);
  return Math.round((baseAdjustment * multiplier) / 5) * 5;
}

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
 * recommended calorie adjustment and message, then folds in any learned
 * aggressiveness factor (default 0 = the unadjusted base plan). No external AI.
 */
export function buildRecommendedAction(
  goal: FitnessGoal | null,
  trend: WeightTrend,
  learnedFactor = 0,
): RecommendedAction {
  const base = baseRecommendedAction(goal, trend);
  if (learnedFactor === 0 || base.suggestedCalorieAdjustment === 0) {
    return base;
  }
  return {
    ...base,
    suggestedCalorieAdjustment: applyLearning(
      base.suggestedCalorieAdjustment,
      learnedFactor,
    ),
  };
}

function baseRecommendedAction(
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
