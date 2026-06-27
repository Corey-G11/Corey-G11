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
  computeLearnedWeightDelta,
  computeWeightTrend,
} from './coach.logic';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';

export interface Recommendation {
  id: string;
  generatedAt: string;
  metricSnapshot: Record<string, unknown>;
  recommendedAction: Record<string, unknown>;
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

interface FeedbackRow {
  id: string;
  recommendation_id: string;
  adherence_score: string | number;
  subjective_energy_score: number | null;
  user_rejection_reason: string | null;
  system_learned_weight_delta: string | number;
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

    // Fold in what we have learned from recent feedback: the average learned
    // delta across this user's recommendations over the last 60 days.
    const learnedResult = await this.pool.query<{ learned_factor: string | number }>(
      `SELECT COALESCE(AVG(fe.system_learned_weight_delta), 0) AS learned_factor
       FROM feedback_events fe
       JOIN coach_recommendations cr ON cr.id = fe.recommendation_id
       WHERE cr.user_id = $1
         AND cr.generated_at >= now() - interval '60 days'`,
      [userId],
    );
    const learnedFactor = Number(learnedResult.rows[0]?.learned_factor ?? 0);

    const trend = computeWeightTrend(points);
    const latestWeight =
      points.length > 0 ? points[points.length - 1].weightKg : null;
    const action = buildRecommendedAction(goal, trend, learnedFactor);

    const metricSnapshot = {
      latestWeightKg: latestWeight,
      trend,
      goal,
      dailyCalorieTarget,
      windowDays: 14,
      dataPoints: points.length,
      learnedFactor: Number(learnedFactor.toFixed(2)),
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

  async submitFeedback(
    userId: string,
    recommendationId: string,
    dto: SubmitFeedbackDto,
  ): Promise<Feedback> {
    await this.assertOwnership(userId, recommendationId);

    const energy = dto.subjectiveEnergyScore ?? null;
    const rejection = dto.userRejectionReason?.trim() || null;
    const learnedDelta = computeLearnedWeightDelta({
      adherenceScore: dto.adherenceScore,
      subjectiveEnergyScore: energy,
      hasRejection: rejection !== null,
    });

    const result = await this.pool.query<FeedbackRow>(
      `INSERT INTO feedback_events
         (recommendation_id, adherence_score, subjective_energy_score,
          user_rejection_reason, system_learned_weight_delta)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, recommendation_id, adherence_score,
                 subjective_energy_score, user_rejection_reason,
                 system_learned_weight_delta`,
      [recommendationId, dto.adherenceScore, energy, rejection, learnedDelta],
    );
    return this.mapFeedback(result.rows[0]);
  }

  async listFeedback(
    userId: string,
    recommendationId: string,
  ): Promise<Feedback[]> {
    await this.assertOwnership(userId, recommendationId);

    const result = await this.pool.query<FeedbackRow>(
      `SELECT id, recommendation_id, adherence_score,
              subjective_energy_score, user_rejection_reason,
              system_learned_weight_delta
       FROM feedback_events
       WHERE recommendation_id = $1`,
      [recommendationId],
    );
    return result.rows.map((row) => this.mapFeedback(row));
  }

  async acknowledge(userId: string, id: string): Promise<Recommendation> {
    await this.assertOwnership(userId, id);

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

  private async assertOwnership(
    userId: string,
    recommendationId: string,
  ): Promise<void> {
    const owner = await this.pool.query<{ user_id: string }>(
      `SELECT user_id FROM coach_recommendations WHERE id = $1 LIMIT 1`,
      [recommendationId],
    );
    const row = owner.rows[0];
    if (!row) {
      throw new NotFoundException('Recommendation not found');
    }
    if (row.user_id !== userId) {
      throw new ForbiddenException('Not your recommendation');
    }
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

  private mapFeedback(row: FeedbackRow): Feedback {
    return {
      id: row.id,
      recommendationId: row.recommendation_id,
      adherenceScore: Number(row.adherence_score),
      subjectiveEnergyScore:
        row.subjective_energy_score === null
          ? null
          : Number(row.subjective_energy_score),
      userRejectionReason: row.user_rejection_reason,
      systemLearnedWeightDelta: Number(row.system_learned_weight_delta),
    };
  }
}
