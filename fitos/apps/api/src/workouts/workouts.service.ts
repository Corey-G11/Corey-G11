import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../db/db.module';
import { CreateLogDto } from './dto/create-log.dto';
import { CreateProgramDto } from './dto/create-program.dto';
import { CreateSetDto } from './dto/create-set.dto';
import { UpdateLogDto } from './dto/update-log.dto';

export interface Exercise {
  id: string;
  name: string;
  target_muscle_group: string | null;
  equipment_required: string | null;
  video_url: string | null;
}

export interface ScheduledWorkout {
  id: string;
  program_id: string;
  day_number: number;
  name: string;
}

export interface Program {
  id: string;
  user_id: string;
  name: string;
  duration_weeks: number;
  is_active: boolean;
  created_at: string;
  scheduled_workouts: ScheduledWorkout[];
}

export interface WorkoutLog {
  id: string;
  user_id: string;
  scheduled_workout_id: string | null;
  logged_at: string;
  status: string;
  total_duration_minutes: number | null;
  user_notes: string | null;
}

export interface ExerciseLog {
  id: string;
  workout_log_id: string;
  exercise_id: string;
  set_index: number;
  target_reps: number | null;
  actual_reps: number;
  weight_kg: string;
  rpe: string | null;
  is_completed: boolean;
  exercise_name?: string;
}

@Injectable()
export class WorkoutsService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async listExercises(muscle?: string): Promise<Exercise[]> {
    if (muscle && muscle.trim().length > 0) {
      const { rows } = await this.pool.query<Exercise>(
        `SELECT id, name, target_muscle_group, equipment_required, video_url
           FROM exercises
          WHERE target_muscle_group ILIKE $1
          ORDER BY name ASC`,
        [`%${muscle.trim()}%`],
      );
      return rows;
    }
    const { rows } = await this.pool.query<Exercise>(
      `SELECT id, name, target_muscle_group, equipment_required, video_url
         FROM exercises
        ORDER BY name ASC`,
    );
    return rows;
  }

  async createProgram(userId: string, dto: CreateProgramDto): Promise<Program> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const programRes = await client.query<Program>(
        `INSERT INTO training_programs (user_id, name, duration_weeks, is_active)
         VALUES ($1, $2, $3, FALSE)
         RETURNING id, user_id, name, duration_weeks, is_active, created_at`,
        [userId, dto.name, dto.durationWeeks],
      );
      const program = programRes.rows[0];

      const days: ScheduledWorkout[] = [];
      for (const day of dto.days) {
        const dayRes = await client.query<ScheduledWorkout>(
          `INSERT INTO scheduled_workouts (program_id, day_number, name)
           VALUES ($1, $2, $3)
           RETURNING id, program_id, day_number, name`,
          [program.id, day.dayNumber, day.name],
        );
        days.push(dayRes.rows[0]);
      }

      await client.query('COMMIT');
      return { ...program, scheduled_workouts: days };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async listPrograms(userId: string): Promise<Program[]> {
    const { rows: programs } = await this.pool.query<
      Omit<Program, 'scheduled_workouts'>
    >(
      `SELECT id, user_id, name, duration_weeks, is_active, created_at
         FROM training_programs
        WHERE user_id = $1
        ORDER BY is_active DESC, created_at DESC`,
      [userId],
    );

    if (programs.length === 0) return [];

    const programIds = programs.map((p) => p.id);
    const { rows: workouts } = await this.pool.query<ScheduledWorkout>(
      `SELECT id, program_id, day_number, name
         FROM scheduled_workouts
        WHERE program_id = ANY($1::uuid[])
        ORDER BY day_number ASC`,
      [programIds],
    );

    return programs.map((p) => ({
      ...p,
      scheduled_workouts: workouts.filter((w) => w.program_id === p.id),
    }));
  }

  async createLog(userId: string, dto: CreateLogDto): Promise<WorkoutLog> {
    if (dto.scheduledWorkoutId) {
      const { rows } = await this.pool.query<{ id: string }>(
        `SELECT sw.id
           FROM scheduled_workouts sw
           JOIN training_programs tp ON tp.id = sw.program_id
          WHERE sw.id = $1 AND tp.user_id = $2`,
        [dto.scheduledWorkoutId, userId],
      );
      if (rows.length === 0) {
        throw new NotFoundException('Scheduled workout not found');
      }
    }

    const { rows } = await this.pool.query<WorkoutLog>(
      `INSERT INTO workout_logs
         (user_id, scheduled_workout_id, status, total_duration_minutes, user_notes)
       VALUES ($1, $2, COALESCE($3, 'pending'), $4, $5)
       RETURNING id, user_id, scheduled_workout_id, logged_at, status,
                 total_duration_minutes, user_notes`,
      [
        userId,
        dto.scheduledWorkoutId ?? null,
        dto.status ?? null,
        dto.totalDurationMinutes ?? null,
        dto.userNotes ?? null,
      ],
    );
    return rows[0];
  }

  private async getOwnedLog(
    userId: string,
    logId: string,
  ): Promise<WorkoutLog> {
    const { rows } = await this.pool.query<WorkoutLog>(
      `SELECT id, user_id, scheduled_workout_id, logged_at, status,
              total_duration_minutes, user_notes
         FROM workout_logs
        WHERE id = $1`,
      [logId],
    );
    if (rows.length === 0) {
      throw new NotFoundException('Workout log not found');
    }
    if (rows[0].user_id !== userId) {
      throw new ForbiddenException('You do not own this workout log');
    }
    return rows[0];
  }

  async addSet(
    userId: string,
    logId: string,
    dto: CreateSetDto,
  ): Promise<ExerciseLog> {
    await this.getOwnedLog(userId, logId);

    const exerciseRes = await this.pool.query<{ id: string }>(
      `SELECT id FROM exercises WHERE id = $1`,
      [dto.exerciseId],
    );
    if (exerciseRes.rows.length === 0) {
      throw new NotFoundException('Exercise not found');
    }

    const { rows } = await this.pool.query<ExerciseLog>(
      `INSERT INTO exercise_logs
         (workout_log_id, exercise_id, set_index, target_reps,
          actual_reps, weight_kg, rpe, is_completed)
       VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, TRUE))
       RETURNING id, workout_log_id, exercise_id, set_index, target_reps,
                 actual_reps, weight_kg, rpe, is_completed`,
      [
        logId,
        dto.exerciseId,
        dto.setIndex,
        dto.targetReps ?? null,
        dto.actualReps,
        dto.weightKg,
        dto.rpe ?? null,
        dto.isCompleted ?? null,
      ],
    );
    return rows[0];
  }

  async updateLog(
    userId: string,
    logId: string,
    dto: UpdateLogDto,
  ): Promise<WorkoutLog> {
    await this.getOwnedLog(userId, logId);

    const { rows } = await this.pool.query<WorkoutLog>(
      `UPDATE workout_logs
          SET status = COALESCE($1, status),
              total_duration_minutes = COALESCE($2, total_duration_minutes),
              user_notes = COALESCE($3, user_notes)
        WHERE id = $4 AND user_id = $5
        RETURNING id, user_id, scheduled_workout_id, logged_at, status,
                  total_duration_minutes, user_notes`,
      [
        dto.status ?? null,
        dto.totalDurationMinutes ?? null,
        dto.userNotes ?? null,
        logId,
        userId,
      ],
    );
    return rows[0];
  }

  async listLogs(userId: string): Promise<WorkoutLog[]> {
    const { rows } = await this.pool.query<WorkoutLog>(
      `SELECT id, user_id, scheduled_workout_id, logged_at, status,
              total_duration_minutes, user_notes
         FROM workout_logs
        WHERE user_id = $1
        ORDER BY logged_at DESC
        LIMIT 50`,
      [userId],
    );
    return rows;
  }

  async getLog(
    userId: string,
    logId: string,
  ): Promise<WorkoutLog & { exercise_logs: ExerciseLog[] }> {
    const log = await this.getOwnedLog(userId, logId);

    const { rows: sets } = await this.pool.query<ExerciseLog>(
      `SELECT el.id, el.workout_log_id, el.exercise_id, el.set_index,
              el.target_reps, el.actual_reps, el.weight_kg, el.rpe,
              el.is_completed, e.name AS exercise_name
         FROM exercise_logs el
         JOIN exercises e ON e.id = el.exercise_id
        WHERE el.workout_log_id = $1
        ORDER BY el.set_index ASC`,
      [logId],
    );

    return { ...log, exercise_logs: sets };
  }
}
