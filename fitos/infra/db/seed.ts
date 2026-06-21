import { Client } from 'pg';

interface ExerciseSeed {
  name: string;
  target_muscle_group: string;
  equipment_required: string;
}

const exercises: ExerciseSeed[] = [
  { name: 'Bench Press', target_muscle_group: 'chest', equipment_required: 'barbell' },
  { name: 'Incline DB Press', target_muscle_group: 'chest', equipment_required: 'dumbbells' },
  { name: 'Shoulder Press', target_muscle_group: 'shoulders', equipment_required: 'barbell' },
  { name: 'Lateral Raises', target_muscle_group: 'shoulders', equipment_required: 'dumbbells' },
  { name: 'Tricep Pushdowns', target_muscle_group: 'triceps', equipment_required: 'cable' },
  { name: 'Pull-Ups', target_muscle_group: 'back', equipment_required: 'bodyweight' },
  { name: 'Barbell Row', target_muscle_group: 'back', equipment_required: 'barbell' },
  { name: 'Lat Pulldown', target_muscle_group: 'back', equipment_required: 'cable' },
  { name: 'Bicep Curls', target_muscle_group: 'biceps', equipment_required: 'dumbbells' },
  { name: 'Face Pulls', target_muscle_group: 'rear delts', equipment_required: 'cable' },
  { name: 'Back Squat', target_muscle_group: 'quads', equipment_required: 'barbell' },
  { name: 'Romanian Deadlift', target_muscle_group: 'hamstrings', equipment_required: 'barbell' },
  { name: 'Leg Press', target_muscle_group: 'quads', equipment_required: 'machine' },
  { name: 'Leg Curl', target_muscle_group: 'hamstrings', equipment_required: 'machine' },
  { name: 'Calf Raises', target_muscle_group: 'calves', equipment_required: 'machine' },
  { name: 'Deadlift', target_muscle_group: 'posterior chain', equipment_required: 'barbell' },
  { name: 'Hip Thrust', target_muscle_group: 'glutes', equipment_required: 'barbell' },
  { name: 'Bulgarian Split Squat', target_muscle_group: 'quads', equipment_required: 'dumbbells' },
  { name: 'Plank', target_muscle_group: 'core', equipment_required: 'bodyweight' },
  { name: 'Cable Crunch', target_muscle_group: 'core', equipment_required: 'cable' },
];

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl });

  try {
    await client.connect();

    let seeded = 0;
    for (const ex of exercises) {
      const result = await client.query(
        `INSERT INTO exercises (name, target_muscle_group, equipment_required)
         VALUES ($1, $2, $3)
         ON CONFLICT (name) DO NOTHING`,
        [ex.name, ex.target_muscle_group, ex.equipment_required]
      );
      seeded += result.rowCount ?? 0;
    }

    console.log(`Seeded ${seeded} exercises`);
    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    try {
      await client.end();
    } catch {
      // ignore errors closing the connection
    }
    process.exit(1);
  }
}

main();
