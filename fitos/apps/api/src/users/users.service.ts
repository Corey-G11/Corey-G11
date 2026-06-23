import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import type { MacroTargets } from '@fitos/shared';
import { PG_POOL } from '../db/db.module';
import { TdeeService } from '../tdee/tdee.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

interface UserGoalRow {
  daily_calorie_target: number;
  protein_target_g: number;
  carbohydrate_target_g: number;
  fat_target_g: number;
  primary_goal: MacroTargets['goal'];
  tdee: number;
  bmr: number;
}

interface ProfileRow {
  user_id: string;
  first_name: string;
  date_of_birth: string;
  gender: 'male' | 'female' | 'other' | null;
  height_cm: number;
  activity_level:
    | 'sedentary'
    | 'light'
    | 'moderate'
    | 'active'
    | 'very_active';
}

export interface UpdateProfileResult {
  profile: ProfileRow;
  goals: MacroTargets | null;
}

@Injectable()
export class UsersService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly tdeeService: TdeeService,
  ) {}

  async getActiveGoals(userId: string): Promise<MacroTargets> {
    const result = await this.pool.query<UserGoalRow>(
      `SELECT daily_calorie_target, protein_target_g, carbohydrate_target_g,
              fat_target_g, primary_goal, tdee, bmr
       FROM user_goals
       WHERE user_id = $1 AND is_active = TRUE
       LIMIT 1`,
      [userId],
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException('No active goals found');
    }

    return this.mapGoals(row);
  }

  async getMe(userId: string): Promise<unknown> {
    const result = await this.pool.query(
      `SELECT
         u.id AS user_id,
         u.email,
         u.role,
         u.created_at,
         p.first_name,
         p.date_of_birth,
         p.gender,
         p.height_cm,
         p.activity_level,
         g.primary_goal,
         g.daily_calorie_target,
         g.protein_target_g,
         g.carbohydrate_target_g,
         g.fat_target_g,
         g.tdee,
         g.bmr
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       LEFT JOIN user_goals g ON g.user_id = u.id AND g.is_active = TRUE
       WHERE u.id = $1
       LIMIT 1`,
      [userId],
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException('User not found');
    }
    return row;
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<UpdateProfileResult> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const existing = await client.query<ProfileRow>(
        `SELECT user_id, first_name, date_of_birth, gender, height_cm, activity_level
         FROM profiles WHERE user_id = $1`,
        [userId],
      );
      const current = existing.rows[0];
      if (!current) {
        throw new NotFoundException('Profile not found');
      }

      const merged: ProfileRow = {
        user_id: userId,
        first_name: dto.firstName ?? current.first_name,
        date_of_birth: dto.dateOfBirth ?? current.date_of_birth,
        gender: dto.gender ?? current.gender,
        height_cm: dto.heightCm ?? current.height_cm,
        activity_level: dto.activityLevel ?? current.activity_level,
      };

      const updated = await client.query<ProfileRow>(
        `UPDATE profiles
         SET first_name = $2, date_of_birth = $3, gender = $4,
             height_cm = $5, activity_level = $6, updated_at = NOW()
         WHERE user_id = $1
         RETURNING user_id, first_name, date_of_birth, gender, height_cm, activity_level`,
        [
          userId,
          merged.first_name,
          merged.date_of_birth,
          merged.gender,
          merged.height_cm,
          merged.activity_level,
        ],
      );

      const goals = await this.recalculateGoals(client, userId, updated.rows[0]);

      await client.query('COMMIT');
      return { profile: updated.rows[0], goals };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  private async recalculateGoals(
    client: import('pg').PoolClient,
    userId: string,
    profile: ProfileRow,
  ): Promise<MacroTargets | null> {
    const weightResult = await client.query<{ weight_kg: number }>(
      `SELECT weight_kg FROM biometrics_ledger
       WHERE user_id = $1 ORDER BY recorded_at DESC LIMIT 1`,
      [userId],
    );
    const activeGoal = await client.query<{
      primary_goal: MacroTargets['goal'];
      target_weight_kg: number | null;
    }>(
      `SELECT primary_goal, target_weight_kg FROM user_goals
       WHERE user_id = $1 AND is_active = TRUE LIMIT 1`,
      [userId],
    );

    const weight = weightResult.rows[0]?.weight_kg;
    const goal = activeGoal.rows[0];
    // Without a recorded weight or an existing goal there's nothing to recompute.
    if (weight == null || !goal || !profile.gender) {
      return null;
    }

    const macros = this.tdeeService.calculate({
      gender: profile.gender,
      weightKg: Number(weight),
      heightCm: Number(profile.height_cm),
      dateOfBirth: profile.date_of_birth,
      activityLevel: profile.activity_level,
      primaryGoal: goal.primary_goal,
    });

    await client.query(
      `UPDATE user_goals SET is_active = FALSE WHERE user_id = $1`,
      [userId],
    );
    await client.query(
      `INSERT INTO user_goals (
         user_id, primary_goal, target_weight_kg, daily_calorie_target,
         protein_target_g, carbohydrate_target_g, fat_target_g, tdee, bmr, is_active
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)`,
      [
        userId,
        goal.primary_goal,
        goal.target_weight_kg,
        macros.dailyCalories,
        macros.proteinG,
        macros.carbsG,
        macros.fatG,
        macros.tdee,
        macros.bmr,
      ],
    );

    return macros;
  }

  private mapGoals(row: UserGoalRow): MacroTargets {
    return {
      dailyCalories: row.daily_calorie_target,
      proteinG: row.protein_target_g,
      carbsG: row.carbohydrate_target_g,
      fatG: row.fat_target_g,
      goal: row.primary_goal,
      tdee: row.tdee,
      bmr: row.bmr,
    };
  }
}
