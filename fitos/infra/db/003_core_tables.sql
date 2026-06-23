CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email varchar(255) UNIQUE NOT NULL,
  password_hash varchar(255) NOT NULL,
  role user_role DEFAULT 'free',
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

CREATE TABLE profiles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  first_name varchar(100) NOT NULL,
  date_of_birth date NOT NULL,
  gender varchar(50),
  height_cm numeric(5,2) NOT NULL,
  activity_level activity_level NOT NULL DEFAULT 'sedentary',
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

CREATE TABLE biometrics_ledger (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recorded_at timestamptz NOT NULL DEFAULT NOW(),
  weight_kg numeric(5,2) NOT NULL,
  body_fat_percentage numeric(4,2),
  resting_heart_rate int,
  sleep_duration_minutes int
);

CREATE INDEX idx_biometrics_user_date ON biometrics_ledger(user_id, recorded_at DESC);

CREATE TABLE user_goals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  primary_goal fitness_goal NOT NULL,
  target_weight_kg numeric(5,2),
  daily_calorie_target int NOT NULL,
  protein_target_g int NOT NULL,
  carbohydrate_target_g int NOT NULL,
  fat_target_g int NOT NULL,
  tdee int NOT NULL,
  bmr int NOT NULL,
  is_active boolean DEFAULT TRUE,
  created_at timestamptz DEFAULT NOW()
);

CREATE INDEX idx_user_goals_active ON user_goals(user_id) WHERE is_active = TRUE;

CREATE TABLE exercises (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name varchar(255) UNIQUE NOT NULL,
  target_muscle_group varchar(100) NOT NULL,
  equipment_required varchar(100) NOT NULL,
  video_url text
);

CREATE TABLE training_programs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  duration_weeks int NOT NULL,
  is_active boolean DEFAULT TRUE,
  created_at timestamptz DEFAULT NOW()
);

CREATE TABLE scheduled_workouts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  program_id uuid NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
  day_number int NOT NULL,
  name varchar(255) NOT NULL
);

CREATE TABLE workout_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scheduled_workout_id uuid REFERENCES scheduled_workouts(id) ON DELETE SET NULL,
  logged_at timestamptz DEFAULT NOW(),
  status completion_status DEFAULT 'pending',
  total_duration_minutes int,
  user_notes text
);

CREATE TABLE exercise_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_log_id uuid NOT NULL REFERENCES workout_logs(id) ON DELETE CASCADE,
  exercise_id uuid REFERENCES exercises(id),
  set_index int NOT NULL,
  target_reps int,
  actual_reps int NOT NULL,
  weight_kg numeric(6,2) NOT NULL,
  rpe numeric(3,1) CHECK (rpe >= 1.0 AND rpe <= 10.0),
  is_completed boolean DEFAULT TRUE
);

CREATE INDEX idx_exercise_logs_lookup ON exercise_logs(workout_log_id);

CREATE TABLE foods_dictionary (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  barcode varchar(100) UNIQUE,
  name varchar(255) NOT NULL,
  brand varchar(255),
  serving_size_g numeric(6,2) DEFAULT 100,
  calories_per_serving int NOT NULL,
  protein_per_serving numeric(5,2) NOT NULL,
  carbs_per_serving numeric(5,2) NOT NULL,
  fat_per_serving numeric(5,2) NOT NULL
);

CREATE INDEX idx_foods_search ON foods_dictionary USING gin(to_tsvector('english', name));

CREATE TABLE nutrition_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  food_id uuid REFERENCES foods_dictionary(id),
  logged_at timestamptz DEFAULT NOW(),
  servings_consumed numeric(4,2) DEFAULT 1.0,
  meal_index int NOT NULL CHECK (meal_index >= 1 AND meal_index <= 4)
);

CREATE INDEX idx_nutrition_logs_user_date ON nutrition_logs(user_id, logged_at DESC);

CREATE TABLE coach_recommendations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  generated_at timestamptz DEFAULT NOW(),
  metric_snapshot jsonb NOT NULL,
  recommended_action jsonb NOT NULL,
  is_acknowledged boolean DEFAULT FALSE,
  acknowledged_at timestamptz
);

CREATE TABLE feedback_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  recommendation_id uuid NOT NULL REFERENCES coach_recommendations(id) ON DELETE CASCADE,
  adherence_score numeric(3,2) NOT NULL CHECK (adherence_score >= 0.00 AND adherence_score <= 1.00),
  subjective_energy_score int CHECK (subjective_energy_score >= 1 AND subjective_energy_score <= 5),
  user_rejection_reason text,
  system_learned_weight_delta numeric(4,2) DEFAULT 0.00
);
