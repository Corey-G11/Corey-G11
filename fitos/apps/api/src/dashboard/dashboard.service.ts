import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../db/db.module';

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

export interface Biometric {
  id: string;
  recordedAt: string;
  weightKg: number;
  bodyFatPercentage: number | null;
  restingHeartRate: number | null;
  sleepDurationMinutes: number | null;
}

export interface Recommendation {
  id: string;
  generatedAt: string;
  metricSnapshot: Record<string, unknown>;
  recommendedAction: Record<string, unknown>;
  isAcknowledged: boolean;
  acknowledgedAt: string | null;
}

export interface DashboardSnapshot {
  goals: DashboardGoals | null;
  latestWeightKg: number | null;
  weightDeltaKg: number | null;
  todayCalories: number;
  workoutsThisWeek: number;
  latestRecommendation: Recommendation | null;
}

export interface CreateBiometricInput {
  weightKg: number;
  bodyFatPercentage?: number;
  restingHeartRate?: number;
  sleepDurationMinutes?: number;
}

interface GoalRow {
  primary_goal: FitnessGoal;
  target_weight_kg: string | number | null;
  daily_calorie_target: string | number;
  protein_target_g: string | number;
  carbohydrate_target_g: string | number;
  fat_target_g: string | number;
  tdee: string | number | null;
  bmr: string | number | null;
}

interface BiometricRow {
  id: string;
  recorded_at: Date;
  weight_kg: string | number;
  body_fat_percentage: string | number | null;
  resting_heart_rate: number | null;
  sleep_duration_minutes: number | null;
}

interface RecommendationRow {
  id: string;
  generated_at: Date;
  metric_snapshot: Record<string, unknown>;
  recommended_action: Record<string, unknown>;
  is_acknowledged: boolean;
  acknowledged_at: Date | null;
}

function toNum(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(n) ? n : null;
}

@Injectable()
export class DashboardService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async getSnapshot(userId: string): Promise<DashboardSnapshot> {
    const [goals, weights, todayCalories, workoutsThisWeek, latestRecommendation] =
      await Promise.all([
        this.getActiveGoals(userId),
        this.getWeightSummary(userId),
        this.getTodayCalories(userId),
        this.getWorkoutsThisWeek(userId),
        this.getLatestRecommendation(userId),
      ]);

    return {
      goals,
      latestWeightKg: weights.latestWeightKg,
      weightDeltaKg: weights.weightDeltaKg,
      todayCalories,
      workoutsThisWeek,
      latestRecommendation,
    };
  }

  async createBiometric(
    userId: string,
    input: CreateBiometricInput,
  ): Promise<Biometric> {
    const result = await this.pool.query<BiometricRow>(
      `INSERT INTO biometrics_ledger
         (user_id, weight_kg, body_fat_percentage, resting_heart_rate, sleep_duration_minutes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, recorded_at, weight_kg, body_fat_percentage,
                 resting_heart_rate, sleep_duration_minutes`,
      [
        userId,
        input.weightKg,
        input.bodyFatPercentage ?? null,
        input.restingHeartRate ?? null,
        input.sleepDurationMinutes ?? null,
      ],
    );
    return this.mapBiometric(result.rows[0]);
  }

  async getBiometrics(userId: string, limit = 30): Promise<Biometric[]> {
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 365) : 30;
    const result = await this.pool.query<BiometricRow>(
      `SELECT id, recorded_at, weight_kg, body_fat_percentage,
              resting_heart_rate, sleep_duration_minutes
       FROM biometrics_ledger
       WHERE user_id = $1
       ORDER BY recorded_at DESC
       LIMIT $2`,
      [userId, safeLimit],
    );
    return result.rows.map((row) => this.mapBiometric(row));
  }

  private async getActiveGoals(userId: string): Promise<DashboardGoals | null> {
    const result = await this.pool.query<GoalRow>(
      `SELECT primary_goal, target_weight_kg, daily_calorie_target,
              protein_target_g, carbohydrate_target_g, fat_target_g, tdee, bmr
       FROM user_goals
       WHERE user_id = $1 AND is_active = TRUE
       LIMIT 1`,
      [userId],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      primaryGoal: row.primary_goal,
      targetWeightKg: toNum(row.target_weight_kg),
      dailyCalorieTarget: toNum(row.daily_calorie_target) ?? 0,
      proteinTargetG: toNum(row.protein_target_g) ?? 0,
      carbohydrateTargetG: toNum(row.carbohydrate_target_g) ?? 0,
      fatTargetG: toNum(row.fat_target_g) ?? 0,
      tdee: toNum(row.tdee),
      bmr: toNum(row.bmr),
    };
  }

  private async getWeightSummary(
    userId: string,
  ): Promise<{ latestWeightKg: number | null; weightDeltaKg: number | null }> {
    const latest = await this.pool.query<{ weight_kg: string | number }>(
      `SELECT weight_kg FROM biometrics_ledger
       WHERE user_id = $1
       ORDER BY recorded_at DESC
       LIMIT 1`,
      [userId],
    );
    const latestWeightKg = latest.rows[0] ? toNum(latest.rows[0].weight_kg) : null;
    if (latestWeightKg === null) {
      return { latestWeightKg: null, weightDeltaKg: null };
    }

    // Oldest entry within the last 30 days, compared against the latest.
    const oldest = await this.pool.query<{ weight_kg: string | number }>(
      `SELECT weight_kg FROM biometrics_ledger
       WHERE user_id = $1 AND recorded_at >= now() - interval '30 days'
       ORDER BY recorded_at ASC
       LIMIT 1`,
      [userId],
    );
    const oldestWeightKg = oldest.rows[0] ? toNum(oldest.rows[0].weight_kg) : null;
    const weightDeltaKg =
      oldestWeightKg === null
        ? null
        : Math.round((latestWeightKg - oldestWeightKg) * 100) / 100;

    return { latestWeightKg, weightDeltaKg };
  }

  private async getTodayCalories(userId: string): Promise<number> {
    const result = await this.pool.query<{ total: string | null }>(
      `SELECT COALESCE(SUM(f.calories_per_serving * nl.servings_consumed), 0) AS total
       FROM nutrition_logs nl
       JOIN foods_dictionary f ON f.id = nl.food_id
       WHERE nl.user_id = $1
         AND nl.logged_at >= date_trunc('day', now())
         AND nl.logged_at < date_trunc('day', now()) + interval '1 day'`,
      [userId],
    );
    return Math.round(toNum(result.rows[0]?.total ?? 0) ?? 0);
  }

  private async getWorkoutsThisWeek(userId: string): Promise<number> {
    const result = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count
       FROM workout_logs
       WHERE user_id = $1
         AND status = 'completed'
         AND logged_at >= now() - interval '7 days'`,
      [userId],
    );
    return Number(result.rows[0]?.count ?? 0);
  }

  private async getLatestRecommendation(
    userId: string,
  ): Promise<Recommendation | null> {
    const result = await this.pool.query<RecommendationRow>(
      `SELECT id, generated_at, metric_snapshot, recommended_action,
              is_acknowledged, acknowledged_at
       FROM coach_recommendations
       WHERE user_id = $1
       ORDER BY generated_at DESC
       LIMIT 1`,
      [userId],
    );
    const row = result.rows[0];
    return row ? this.mapRecommendation(row) : null;
  }

  private mapBiometric(row: BiometricRow): Biometric {
    return {
      id: row.id,
      recordedAt: row.recorded_at.toISOString(),
      weightKg: toNum(row.weight_kg) ?? 0,
      bodyFatPercentage: toNum(row.body_fat_percentage),
      restingHeartRate: row.resting_heart_rate,
      sleepDurationMinutes: row.sleep_duration_minutes,
    };
  }

  private mapRecommendation(row: RecommendationRow): Recommendation {
    return {
      id: row.id,
      generatedAt: row.generated_at.toISOString(),
      metricSnapshot: row.metric_snapshot,
      recommendedAction: row.recommended_action,
      isAcknowledged: row.is_acknowledged,
      acknowledgedAt: row.acknowledged_at ? row.acknowledged_at.toISOString() : null,
    };
  }
}
