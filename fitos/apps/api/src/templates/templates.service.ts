import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../db/db.module';

export interface TemplateDay {
  dayNumber: number;
  name: string;
  focus: string;
  exercises: string[];
}

export interface ProgramTemplate {
  id: string;
  name: string;
  description: string;
  durationWeeks: number;
  daysPerWeek: number;
  days: TemplateDay[];
}

export interface AdoptedProgram {
  id: string;
  name: string;
  durationWeeks: number;
  isActive: boolean;
  scheduledWorkouts: { id: string; dayNumber: number; name: string }[];
}

const TEMPLATES: ProgramTemplate[] = [
  {
    id: 'ppl-6day',
    name: 'Push / Pull / Legs',
    description:
      'Classic 6-day hypertrophy split hitting each muscle group twice per week.',
    durationWeeks: 8,
    daysPerWeek: 6,
    days: [
      {
        dayNumber: 1,
        name: 'Push A',
        focus: 'Chest, Shoulders, Triceps',
        exercises: ['Bench Press', 'Shoulder Press', 'Tricep Pushdowns', 'Lateral Raises'],
      },
      {
        dayNumber: 2,
        name: 'Pull A',
        focus: 'Back, Biceps',
        exercises: ['Barbell Row', 'Lat Pulldown', 'Bicep Curls', 'Face Pulls'],
      },
      {
        dayNumber: 3,
        name: 'Legs A',
        focus: 'Quads, Hamstrings, Calves',
        exercises: ['Back Squat', 'Romanian Deadlift', 'Leg Press', 'Calf Raises'],
      },
      {
        dayNumber: 4,
        name: 'Push B',
        focus: 'Shoulders, Chest, Triceps',
        exercises: ['Incline DB Press', 'Shoulder Press', 'Lateral Raises', 'Tricep Pushdowns'],
      },
      {
        dayNumber: 5,
        name: 'Pull B',
        focus: 'Back, Biceps',
        exercises: ['Pull-Ups', 'Barbell Row', 'Bicep Curls', 'Face Pulls'],
      },
      {
        dayNumber: 6,
        name: 'Legs B',
        focus: 'Posterior Chain, Quads',
        exercises: ['Deadlift', 'Hip Thrust', 'Bulgarian Split Squat', 'Leg Curl'],
      },
    ],
  },
  {
    id: 'upper-lower-4day',
    name: 'Upper / Lower',
    description:
      'Balanced 4-day split alternating upper and lower body — great for strength and size.',
    durationWeeks: 8,
    daysPerWeek: 4,
    days: [
      {
        dayNumber: 1,
        name: 'Upper A',
        focus: 'Chest, Back, Arms',
        exercises: ['Bench Press', 'Barbell Row', 'Shoulder Press', 'Bicep Curls'],
      },
      {
        dayNumber: 2,
        name: 'Lower A',
        focus: 'Quads, Hamstrings',
        exercises: ['Back Squat', 'Romanian Deadlift', 'Leg Press', 'Calf Raises'],
      },
      {
        dayNumber: 3,
        name: 'Upper B',
        focus: 'Back, Chest, Shoulders',
        exercises: ['Lat Pulldown', 'Incline DB Press', 'Lateral Raises', 'Tricep Pushdowns'],
      },
      {
        dayNumber: 4,
        name: 'Lower B',
        focus: 'Glutes, Hamstrings, Quads',
        exercises: ['Deadlift', 'Hip Thrust', 'Bulgarian Split Squat', 'Leg Curl'],
      },
    ],
  },
  {
    id: 'full-body-3day',
    name: 'Full Body 3-Day',
    description:
      'Efficient 3-day full-body routine — ideal for beginners or busy schedules.',
    durationWeeks: 6,
    daysPerWeek: 3,
    days: [
      {
        dayNumber: 1,
        name: 'Full Body A',
        focus: 'Compound Strength',
        exercises: ['Back Squat', 'Bench Press', 'Barbell Row', 'Plank'],
      },
      {
        dayNumber: 2,
        name: 'Full Body B',
        focus: 'Posterior Chain',
        exercises: ['Deadlift', 'Shoulder Press', 'Lat Pulldown', 'Cable Crunch'],
      },
      {
        dayNumber: 3,
        name: 'Full Body C',
        focus: 'Hypertrophy',
        exercises: ['Leg Press', 'Incline DB Press', 'Pull-Ups', 'Lateral Raises'],
      },
    ],
  },
];

@Injectable()
export class TemplatesService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  listTemplates(): ProgramTemplate[] {
    return TEMPLATES;
  }

  getTemplate(id: string): ProgramTemplate {
    const template = TEMPLATES.find((t) => t.id === id);
    if (!template) {
      throw new NotFoundException('Template not found');
    }
    return template;
  }

  async adopt(userId: string, templateId: string): Promise<AdoptedProgram> {
    const template = this.getTemplate(templateId);

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Retire any currently active program so the new one is the focus.
      await client.query(
        `UPDATE training_programs SET is_active = FALSE WHERE user_id = $1`,
        [userId],
      );

      const program = await client.query<{ id: string }>(
        `INSERT INTO training_programs (user_id, name, duration_weeks, is_active)
         VALUES ($1, $2, $3, TRUE) RETURNING id`,
        [userId, template.name, template.durationWeeks],
      );
      const programId = program.rows[0].id;

      const scheduledWorkouts: AdoptedProgram['scheduledWorkouts'] = [];
      for (const day of template.days) {
        const sw = await client.query<{ id: string }>(
          `INSERT INTO scheduled_workouts (program_id, day_number, name)
           VALUES ($1, $2, $3) RETURNING id`,
          [programId, day.dayNumber, day.name],
        );
        scheduledWorkouts.push({
          id: sw.rows[0].id,
          dayNumber: day.dayNumber,
          name: day.name,
        });
      }

      await client.query('COMMIT');
      return {
        id: programId,
        name: template.name,
        durationWeeks: template.durationWeeks,
        isActive: true,
        scheduledWorkouts,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
