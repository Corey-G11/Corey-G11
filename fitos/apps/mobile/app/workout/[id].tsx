import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { theme } from '../../src/theme';
import { useSession } from '../../src/store/session.store';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import {
  addSet,
  fetchExercises,
  fetchLog,
  updateLog,
} from '../../src/features/workouts/api';
import type {
  Exercise,
  WorkoutLogDetail,
} from '../../src/features/workouts/types';

export default function WorkoutDetailScreen(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useSession();
  const router = useRouter();

  const [log, setLog] = useState<WorkoutLogDetail | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [exerciseId, setExerciseId] = useState<string | null>(null);
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [rpe, setRpe] = useState('');
  const [saving, setSaving] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const load = useCallback(async () => {
    if (!token || !id) return;
    setLoading(true);
    setError(null);
    try {
      const [detail, ex] = await Promise.all([
        fetchLog(token, id),
        fetchExercises(token),
      ]);
      setLog(detail);
      setExercises(ex);
      if (!exerciseId && ex.length > 0) setExerciseId(ex[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load workout');
    } finally {
      setLoading(false);
    }
  }, [token, id, exerciseId]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, id]);

  const nextSetIndex = useMemo(
    () => (log ? log.exercise_logs.length : 0),
    [log],
  );

  const onAddSet = useCallback(async () => {
    if (!token || !id || !exerciseId || saving) return;
    const actualReps = parseInt(reps, 10);
    const weightKg = parseFloat(weight);
    if (Number.isNaN(actualReps) || actualReps < 0) {
      setError('Enter valid reps');
      return;
    }
    if (Number.isNaN(weightKg) || weightKg < 0) {
      setError('Enter valid weight');
      return;
    }
    const rpeVal = rpe.trim() ? parseFloat(rpe) : undefined;
    if (rpeVal !== undefined && (Number.isNaN(rpeVal) || rpeVal < 1 || rpeVal > 10)) {
      setError('RPE must be 1–10');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await addSet(token, id, {
        exerciseId,
        setIndex: nextSetIndex,
        actualReps,
        weightKg,
        rpe: rpeVal,
      });
      setReps('');
      setWeight('');
      setRpe('');
      const detail = await fetchLog(token, id);
      setLog(detail);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add set');
    } finally {
      setSaving(false);
    }
  }, [token, id, exerciseId, reps, weight, rpe, nextSetIndex, saving]);

  const onFinish = useCallback(async () => {
    if (!token || !id || finishing) return;
    setFinishing(true);
    setError(null);
    try {
      await updateLog(token, id, { status: 'completed' });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not finish workout');
      setFinishing(false);
    }
  }, [token, id, finishing, router]);

  if (!token) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.muted}>Sign in to track workouts</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ title: 'Log Workout' }} />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.emerald} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.logo}>FitOS</Text>
          <Text style={styles.heading}>Log Workout</Text>
          {log ? (
            <Text style={styles.status}>STATUS: {log.status.replace('_', ' ')}</Text>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Text style={styles.sectionLabel}>Add Set</Text>

          <Text style={styles.fieldLabel}>Exercise</Text>
          <View style={styles.pickerWrap}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pickerRow}
            >
              {exercises.map((ex) => {
                const active = ex.id === exerciseId;
                return (
                  <Pressable
                    key={ex.id}
                    onPress={() => setExerciseId(ex.id)}
                    style={[
                      styles.chip,
                      active ? styles.chipActive : styles.chipInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        active ? styles.chipTextActive : null,
                      ]}
                    >
                      {ex.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <Input
            label="Reps"
            value={reps}
            onChangeText={setReps}
            keyboardType="number-pad"
            placeholder="10"
          />
          <Input
            label="Weight (kg)"
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
            placeholder="60"
          />
          <Input
            label="RPE (optional)"
            value={rpe}
            onChangeText={setRpe}
            keyboardType="decimal-pad"
            placeholder="8"
          />

          <Button
            label={saving ? 'Adding…' : 'Add Set'}
            onPress={onAddSet}
            loading={saving}
            disabled={!exerciseId}
          />

          <Text style={[styles.sectionLabel, styles.sectionSpacer]}>
            Logged Sets
          </Text>
          {log && log.exercise_logs.length > 0 ? (
            log.exercise_logs.map((s) => (
              <View key={s.id} style={styles.setRow}>
                <Text style={styles.setName}>
                  {s.exercise_name ?? 'Exercise'}
                </Text>
                <Text style={styles.setDetail}>
                  {s.actual_reps} reps · {s.weight_kg} kg
                  {s.rpe != null ? ` · RPE ${s.rpe}` : ''}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.muted}>No sets logged yet.</Text>
          )}

          <View style={styles.finishWrap}>
            <Button
              label={finishing ? 'Finishing…' : 'Finish'}
              onPress={onFinish}
              loading={finishing}
              variant="ghost"
            />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.black,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  logo: {
    fontFamily: 'monospace',
    color: theme.colors.emerald,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2,
  },
  heading: {
    color: theme.colors.white,
    fontSize: 26,
    fontWeight: '700',
    marginTop: theme.spacing.xs,
  },
  status: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
  },
  sectionLabel: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: theme.spacing.sm,
  },
  sectionSpacer: {
    marginTop: theme.spacing.xl,
  },
  fieldLabel: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: theme.spacing.xs,
  },
  pickerWrap: {
    marginBottom: theme.spacing.md,
  },
  pickerRow: {
    gap: theme.spacing.sm,
    paddingRight: theme.spacing.md,
  },
  chip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.full,
    borderWidth: 1,
  },
  chipActive: {
    borderColor: theme.colors.emerald,
    backgroundColor: theme.colors.emeraldGlow,
  },
  chipInactive: {
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  chipText: {
    color: theme.colors.muted,
    fontSize: 13,
  },
  chipTextActive: {
    color: theme.colors.emerald,
    fontWeight: '600',
  },
  setRow: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  setName: {
    color: theme.colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  setDetail: {
    color: theme.colors.muted,
    fontSize: 13,
    marginTop: 2,
  },
  muted: {
    color: theme.colors.muted,
    fontSize: 13,
  },
  error: {
    color: theme.colors.red,
    fontSize: 13,
    marginBottom: theme.spacing.md,
  },
  finishWrap: {
    marginTop: theme.spacing.xl,
  },
});
