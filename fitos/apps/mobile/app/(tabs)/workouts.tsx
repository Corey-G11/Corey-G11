import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { theme } from '../../src/theme';
import { useSession } from '../../src/store/session.store';
import { Button } from '../../src/components/Button';
import {
  createLog,
  fetchLogs,
  fetchPrograms,
} from '../../src/features/workouts/api';
import type { Program, WorkoutLog } from '../../src/features/workouts/types';

const STATUS_COLORS: Record<string, string> = {
  completed: theme.colors.emerald,
  pending: theme.colors.amber,
  skipped: theme.colors.muted,
  partially_completed: theme.colors.blue,
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function WorkoutsScreen(): React.JSX.Element {
  const { token } = useSession();
  const router = useRouter();

  const [programs, setPrograms] = useState<Program[]>([]);
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [p, l] = await Promise.all([
        fetchPrograms(token),
        fetchLogs(token),
      ]);
      setPrograms(p);
      setLogs(l);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load workouts');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const startWorkout = useCallback(async () => {
    if (!token || starting) return;
    setStarting(true);
    setError(null);
    try {
      const log = await createLog(token, { status: 'pending' });
      router.push(`/workout/${log.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start workout');
    } finally {
      setStarting(false);
    }
  }, [token, starting, router]);

  if (!token) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.logo}>FitOS</Text>
          <Text style={styles.emptyText}>Sign in to track workouts</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.logo}>FitOS</Text>
        <Text style={styles.heading}>Workouts</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.startWrap}>
          <Button
            label={starting ? 'Starting…' : 'Start Workout'}
            onPress={startWorkout}
            loading={starting}
          />
          <View style={styles.startSpacer} />
          <Button
            label="Browse Program Templates"
            variant="ghost"
            onPress={() => router.push('/programs/templates')}
          />
        </View>

        <Text style={styles.sectionLabel}>Programs</Text>
        {loading && programs.length === 0 ? (
          <ActivityIndicator color={theme.colors.emerald} />
        ) : programs.length === 0 ? (
          <Text style={styles.muted}>No training programs yet.</Text>
        ) : (
          programs.map((p) => (
            <View key={p.id} style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>{p.name}</Text>
                {p.is_active ? (
                  <Text style={styles.activeBadge}>ACTIVE</Text>
                ) : null}
              </View>
              <Text style={styles.muted}>
                {p.duration_weeks} wk · {p.scheduled_workouts.length} day
                {p.scheduled_workouts.length === 1 ? '' : 's'}
              </Text>
            </View>
          ))
        )}

        <Text style={[styles.sectionLabel, styles.sectionSpacer]}>
          Recent Logs
        </Text>
        {loading && logs.length === 0 ? (
          <ActivityIndicator color={theme.colors.emerald} />
        ) : logs.length === 0 ? (
          <Text style={styles.muted}>No workouts logged yet.</Text>
        ) : (
          logs.map((log) => (
            <Pressable
              key={log.id}
              style={styles.card}
              onPress={() => router.push(`/workout/${log.id}`)}
            >
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>{formatDate(log.logged_at)}</Text>
                <Text
                  style={[
                    styles.status,
                    {
                      color:
                        STATUS_COLORS[log.status] ?? theme.colors.muted,
                    },
                  ]}
                >
                  {log.status.replace('_', ' ')}
                </Text>
              </View>
              {log.total_duration_minutes != null ? (
                <Text style={styles.muted}>
                  {log.total_duration_minutes} min
                </Text>
              ) : null}
            </Pressable>
          ))
        )}
      </ScrollView>
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
    fontSize: 28,
    fontWeight: '700',
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
  },
  startWrap: {
    marginBottom: theme.spacing.lg,
  },
  startSpacer: {
    height: theme.spacing.sm,
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
    marginTop: theme.spacing.lg,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  activeBadge: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: theme.colors.emerald,
    letterSpacing: 1,
  },
  status: {
    fontFamily: 'monospace',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  muted: {
    color: theme.colors.muted,
    fontSize: 13,
    marginTop: 2,
  },
  emptyText: {
    color: theme.colors.muted,
    fontSize: 15,
    marginTop: theme.spacing.md,
  },
  error: {
    color: theme.colors.red,
    fontSize: 13,
    marginBottom: theme.spacing.md,
  },
});
