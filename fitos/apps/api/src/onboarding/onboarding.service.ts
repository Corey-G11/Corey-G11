import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import type { MacroTargets } from '@fitos/shared';
import { PG_POOL } from '../db/db.module';
import { TdeeService } from '../tdee/tdee.service';
import { OnboardingDto } from './dto/onboarding.dto';

@Injectable()
export class OnboardingService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly tdeeService: TdeeService,
  ) {}

  async completeOnboarding(
    userId: string,
    dto: OnboardingDto,
  ): Promise<MacroTargets> {
    const macros = this.tdeeService.calculate({
      gender: dto.gender,
      weightKg: dto.weightKg,
      heightCm: dto.heightCm,
      dateOfBirth: dto.dateOfBirth,
      activityLevel: dto.activityLevel,
      primaryGoal: dto.primaryGoal,
    });

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Upsert profile.
      await client.query(
        `INSERT INTO profiles (user_id, first_name, date_of_birth, gender, height_cm, activity_level)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id) DO UPDATE SET
           first_name = EXCLUDED.first_name,
           date_of_birth = EXCLUDED.date_of_birth,
           gender = EXCLUDED.gender,
           height_cm = EXCLUDED.height_cm,
           activity_level = EXCLUDED.activity_level,
           updated_at = NOW()`,
        [
          userId,
          dto.firstName,
          dto.dateOfBirth,
          dto.gender,
          dto.heightCm,
          dto.activityLevel,
        ],
      );

      // 2. Record current weight in the biometrics ledger.
      await client.query(
        `INSERT INTO biometrics_ledger (user_id, weight_kg) VALUES ($1, $2)`,
        [userId, dto.weightKg],
      );

      // 3. Deactivate prior goals.
      await client.query(
        `UPDATE user_goals SET is_active = FALSE WHERE user_id = $1`,
        [userId],
      );

      // 4. Insert the freshly-calculated active goal.
      await client.query(
        `INSERT INTO user_goals (
           user_id, primary_goal, target_weight_kg, daily_calorie_target,
           protein_target_g, carbohydrate_target_g, fat_target_g, tdee, bmr, is_active
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)`,
        [
          userId,
          dto.primaryGoal,
          dto.targetWeightKg ?? null,
          macros.dailyCalories,
          macros.proteinG,
          macros.carbsG,
          macros.fatG,
          macros.tdee,
          macros.bmr,
        ],
      );

      await client.query('COMMIT');
      return macros;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
