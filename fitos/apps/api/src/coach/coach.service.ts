import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../db/db.module';
import {
  FitnessGoal,
  WeightPoint,
  buildRecommendedAction,
  computeWeightTrend,
} from './coach.logic';

export interface Recommendation {
  id: string;
  generatedAt: string;
  metricSnapshot: Record<string, unknown>;
  recommendedAction: Record<string, unknown>;
  isAcknowledged: boolean;
  acknowledgedAt: string | null;
}

interface RecommendationRow {
  id: string;
  generated_at: Date;
  metric_snapshot: Record<string, unknown>;
  recommended_action: Record<string, unknown>;
  is_acknowledged: boolean;
  acknowledged_at: Date | null;
}

interface GoalRow {
  primary_goal: FitnessGoal;
  daily_calorie_target: string | number;
}

interface WeightRow {
  weight_kg: string | number;
  recorded_at: Date;
}

@Injectable()
export class CoachService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async list(userId: string): Promise<Recommendation[]> {
    const result = await this.pool.query<RecommendationRow>(
      `SELECT id, generated_at, metric_snapshot, recommended_action,
              is_acknowledged, acknowledged_at
       FROM coach_recommendations
       WHERE user_id = $1
       ORDER BY generated_at DESC`,
      [userId],
    );
    return result.rows.map((row) => this.mapRow(row));
  }

  async generate(userId: string): Promise<Recommendation> {
    const goalResult = await this.pool.query<GoalRow>(
      `SELECT primary_goal, daily_calorie_target
       FROM user_goals
       WHERE user_id = $1 AND is_active = TRUE
       LIMIT 1`,
      [userId],
    );
    const goalRow = goalResult.rows[0];
    const goal: FitnessGoal | null = goalRow ? goalRow.primary_goal : null;
    const dailyCalorieTarget = goalRow
      ? Number(goalRow.daily_calorie_target)
      : null;

    const weightResult = await this.pool.query<WeightRow>(
      `SELECT weight_kg, recorded_at
       FROM biometrics_ledger
       WHERE user_id = $1 AND recorded_at >= now() - interval '14 days'
       ORDER BY recorded_at ASC`,
      [userId],
    );
    const points: WeightPoint[] = weightResult.rows.map((row) => ({
      weightKg: Number(row.weight_kg),
      recordedAt: row.recorded_at,
    }));

    const trend = computeWeightTrend(points);
    const latestWeight =
      points.length > 0 ? points[points.length - 1].weightKg : null;
    const action = buildRecommendedAction(goal, trend);

    const metricSnapshot = {
      latestWeightKg: latestWeight,
      trend,
      goal,
      dailyCalorieTarget,
      windowDays: 14,
      dataPoints: points.length,
    };

    const result = await this.pool.query<RecommendationRow>(
      `INSERT INTO coach_recommendations (user_id, metric_snapshot, recommended_action)
       VALUES ($1, $2, $3)
       RETURNING id, generated_at, metric_snapshot, recommended_action,
                 is_acknowledged, acknowledged_at`,
      [userId, JSON.stringify(metricSnapshot), JSON.stringify(action)],
    );
    return this.mapRow(result.rows[0]);
  }

  async acknowledge(userId: string, id: string): Promise<Recommendation> {
    const owner = await this.pool.query<{ user_id: string }>(
      `SELECT user_id FROM coach_recommendations WHERE id = $1 LIMIT 1`,
      [id],
    );
    const row = owner.rows[0];
    if (!row) {
      throw new NotFoundException('Recommendation not found');
    }
    if (row.user_id !== userId) {
      throw new ForbiddenException('Not your recommendation');
    }

    const result = await this.pool.query<RecommendationRow>(
      `UPDATE coach_recommendations
       SET is_acknowledged = TRUE, acknowledged_at = now()
       WHERE id = $1
       RETURNING id, generated_at, metric_snapshot, recommended_action,
                 is_acknowledged, acknowledged_at`,
      [id],
    );
    return this.mapRow(result.rows[0]);
  }

  private mapRow(row: RecommendationRow): Recommendation {
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
