ALTER TABLE biometrics_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY biometrics_ledger_isolation ON biometrics_ledger
  USING (user_id = current_setting('request.jwt.claim.user_id', true)::uuid);

CREATE POLICY nutrition_logs_isolation ON nutrition_logs
  USING (user_id = current_setting('request.jwt.claim.user_id', true)::uuid);

CREATE POLICY workout_logs_isolation ON workout_logs
  USING (user_id = current_setting('request.jwt.claim.user_id', true)::uuid);

CREATE POLICY user_goals_isolation ON user_goals
  USING (user_id = current_setting('request.jwt.claim.user_id', true)::uuid);

CREATE POLICY coach_recommendations_isolation ON coach_recommendations
  USING (user_id = current_setting('request.jwt.claim.user_id', true)::uuid);

CREATE POLICY exercise_logs_isolation ON exercise_logs
  USING (workout_log_id IN (SELECT id FROM workout_logs WHERE user_id = current_setting('request.jwt.claim.user_id', true)::uuid));
