import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../db/db.module';
import { CreateFoodDto } from './dto/create-food.dto';
import { CreateLogDto } from './dto/create-log.dto';

export interface Food {
  id: string;
  barcode: string | null;
  name: string;
  brand: string | null;
  servingSizeG: number;
  caloriesPerServing: number;
  proteinPerServing: number;
  carbsPerServing: number;
  fatPerServing: number;
}

export interface NutritionLog {
  id: string;
  userId: string;
  foodId: string;
  loggedAt: string;
  servingsConsumed: number;
  mealIndex: number;
  food: Food;
}

export interface MacroSet {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface DaySummary {
  date: string;
  consumed: MacroSet;
  targets: MacroSet | null;
  remaining: MacroSet | null;
}

interface FoodRow {
  id: string;
  barcode: string | null;
  name: string;
  brand: string | null;
  serving_size_g: string | number;
  calories_per_serving: number;
  protein_per_serving: string | number;
  carbs_per_serving: string | number;
  fat_per_serving: string | number;
}

interface LogRow {
  id: string;
  user_id: string;
  food_id: string;
  logged_at: Date;
  servings_consumed: string | number;
  meal_index: number;
  food: FoodRow;
}

@Injectable()
export class NutritionService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private mapFood(row: FoodRow): Food {
    return {
      id: row.id,
      barcode: row.barcode,
      name: row.name,
      brand: row.brand,
      servingSizeG: Number(row.serving_size_g),
      caloriesPerServing: Number(row.calories_per_serving),
      proteinPerServing: Number(row.protein_per_serving),
      carbsPerServing: Number(row.carbs_per_serving),
      fatPerServing: Number(row.fat_per_serving),
    };
  }

  private mapLog(row: LogRow): NutritionLog {
    return {
      id: row.id,
      userId: row.user_id,
      foodId: row.food_id,
      loggedAt:
        row.logged_at instanceof Date
          ? row.logged_at.toISOString()
          : String(row.logged_at),
      servingsConsumed: Number(row.servings_consumed),
      mealIndex: row.meal_index,
      food: this.mapFood(row.food),
    };
  }

  async searchFoods(query?: string): Promise<Food[]> {
    const term = (query ?? '').trim();
    if (!term) {
      const { rows } = await this.pool.query<FoodRow>(
        `SELECT id, barcode, name, brand, serving_size_g, calories_per_serving,
                protein_per_serving, carbs_per_serving, fat_per_serving
         FROM foods_dictionary
         ORDER BY name
         LIMIT 25`,
      );
      return rows.map((r) => this.mapFood(r));
    }

    // Full-text search first; fall back to ILIKE for short/partial queries.
    const { rows } = await this.pool.query<FoodRow>(
      `SELECT id, barcode, name, brand, serving_size_g, calories_per_serving,
              protein_per_serving, carbs_per_serving, fat_per_serving
       FROM foods_dictionary
       WHERE to_tsvector('english', name) @@ plainto_tsquery('english', $1)
          OR name ILIKE $2
          OR brand ILIKE $2
       ORDER BY
         (to_tsvector('english', name) @@ plainto_tsquery('english', $1)) DESC,
         name
       LIMIT 25`,
      [term, `%${term}%`],
    );
    return rows.map((r) => this.mapFood(r));
  }

  async createFood(dto: CreateFoodDto): Promise<Food> {
    const { rows } = await this.pool.query<FoodRow>(
      `INSERT INTO foods_dictionary
         (barcode, name, brand, serving_size_g, calories_per_serving,
          protein_per_serving, carbs_per_serving, fat_per_serving)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, barcode, name, brand, serving_size_g, calories_per_serving,
                 protein_per_serving, carbs_per_serving, fat_per_serving`,
      [
        dto.barcode ?? null,
        dto.name,
        dto.brand ?? null,
        dto.servingSizeG ?? 100,
        dto.caloriesPerServing,
        dto.proteinPerServing,
        dto.carbsPerServing,
        dto.fatPerServing,
      ],
    );
    return this.mapFood(rows[0]);
  }

  async createLog(userId: string, dto: CreateLogDto): Promise<NutritionLog> {
    const food = await this.pool.query('SELECT id FROM foods_dictionary WHERE id = $1', [
      dto.foodId,
    ]);
    if (food.rowCount === 0) {
      throw new NotFoundException('Food not found');
    }

    const insert = await this.pool.query<{ id: string }>(
      `INSERT INTO nutrition_logs (user_id, food_id, servings_consumed, meal_index)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [userId, dto.foodId, dto.servingsConsumed ?? 1.0, dto.mealIndex],
    );

    const created = await this.getLogById(userId, insert.rows[0].id);
    if (!created) {
      throw new NotFoundException('Failed to load created log');
    }
    return created;
  }

  private async getLogById(
    userId: string,
    id: string,
  ): Promise<NutritionLog | null> {
    const { rows } = await this.pool.query<LogRow>(
      `SELECT nl.id, nl.user_id, nl.food_id, nl.logged_at,
              nl.servings_consumed, nl.meal_index,
              to_jsonb(fd) AS food
       FROM nutrition_logs nl
       JOIN foods_dictionary fd ON fd.id = nl.food_id
       WHERE nl.id = $1 AND nl.user_id = $2`,
      [id, userId],
    );
    if (rows.length === 0) return null;
    return this.mapLog(rows[0]);
  }

  async listLogs(userId: string, date?: string): Promise<NutritionLog[]> {
    const day = date ?? this.today();
    const { rows } = await this.pool.query<LogRow>(
      `SELECT nl.id, nl.user_id, nl.food_id, nl.logged_at,
              nl.servings_consumed, nl.meal_index,
              to_jsonb(fd) AS food
       FROM nutrition_logs nl
       JOIN foods_dictionary fd ON fd.id = nl.food_id
       WHERE nl.user_id = $1 AND nl.logged_at::date = $2::date
       ORDER BY nl.meal_index, nl.logged_at`,
      [userId, day],
    );
    return rows.map((r) => this.mapLog(r));
  }

  async deleteLog(userId: string, id: string): Promise<void> {
    const existing = await this.pool.query<{ user_id: string }>(
      'SELECT user_id FROM nutrition_logs WHERE id = $1',
      [id],
    );
    if (existing.rowCount === 0) {
      throw new NotFoundException('Log not found');
    }
    if (existing.rows[0].user_id !== userId) {
      throw new ForbiddenException('Not allowed to delete this log');
    }
    await this.pool.query('DELETE FROM nutrition_logs WHERE id = $1', [id]);
  }

  async getSummary(userId: string, date?: string): Promise<DaySummary> {
    const day = date ?? this.today();

    const totals = await this.pool.query<{
      calories: string | null;
      protein: string | null;
      carbs: string | null;
      fat: string | null;
    }>(
      `SELECT
         COALESCE(SUM(fd.calories_per_serving * nl.servings_consumed), 0) AS calories,
         COALESCE(SUM(fd.protein_per_serving  * nl.servings_consumed), 0) AS protein,
         COALESCE(SUM(fd.carbs_per_serving    * nl.servings_consumed), 0) AS carbs,
         COALESCE(SUM(fd.fat_per_serving      * nl.servings_consumed), 0) AS fat
       FROM nutrition_logs nl
       JOIN foods_dictionary fd ON fd.id = nl.food_id
       WHERE nl.user_id = $1 AND nl.logged_at::date = $2::date`,
      [userId, day],
    );

    const t = totals.rows[0];
    const consumed: MacroSet = {
      calories: Math.round(Number(t.calories ?? 0)),
      proteinG: Math.round(Number(t.protein ?? 0)),
      carbsG: Math.round(Number(t.carbs ?? 0)),
      fatG: Math.round(Number(t.fat ?? 0)),
    };

    const goal = await this.pool.query<{
      daily_calorie_target: number | null;
      protein_target_g: number | null;
      carbohydrate_target_g: number | null;
      fat_target_g: number | null;
    }>(
      `SELECT daily_calorie_target, protein_target_g,
              carbohydrate_target_g, fat_target_g
       FROM user_goals
       WHERE user_id = $1 AND is_active = TRUE
       ORDER BY created_at DESC NULLS LAST
       LIMIT 1`,
      [userId],
    );

    let targets: MacroSet | null = null;
    let remaining: MacroSet | null = null;
    if (goal.rowCount && goal.rowCount > 0) {
      const g = goal.rows[0];
      targets = {
        calories: Math.round(Number(g.daily_calorie_target ?? 0)),
        proteinG: Math.round(Number(g.protein_target_g ?? 0)),
        carbsG: Math.round(Number(g.carbohydrate_target_g ?? 0)),
        fatG: Math.round(Number(g.fat_target_g ?? 0)),
      };
      remaining = {
        calories: targets.calories - consumed.calories,
        proteinG: targets.proteinG - consumed.proteinG,
        carbsG: targets.carbsG - consumed.carbsG,
        fatG: targets.fatG - consumed.fatG,
      };
    }

    return { date: day, consumed, targets, remaining };
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
