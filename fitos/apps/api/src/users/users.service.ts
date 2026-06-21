import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import type { MacroTargets } from '@fitos/shared';
import { PG_POOL } from '../db/db.module';

interface UserGoalRow {
  daily_calorie_target: number;
  protein_target_g: number;
  carbohydrate_target_g: number;
  fat_target_g: number;
  primary_goal: MacroTargets['goal'];
  tdee: number;
  bmr: number;
}

@Injectable()
export class UsersService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

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
