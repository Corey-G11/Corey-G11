import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme } from '../../src/theme';
import { useSession } from '../../src/store/session.store';
import {
  fetchBiometrics,
  fetchDashboard,
} from '../../src/features/dashboard/api';
import type {
  Biometric,
  DashboardSnapshot,
} from '../../src/features/dashboard/types';
import { GOAL_LABELS } from '../../src/features/dashboard/types';
import { CalorieSummary } from '../../src/features/dashboard/components/CalorieSummary';
import { StatCard } from '../../src/features/dashboard/components/StatCard';
import { WeightChart } from '../../src/features/dashboard/components/WeightChart';
import { CoachCard } from '../../src/features/dashboard/components/CoachCard';

function formatDelta(delta: number | null): string {
  if (delta === null) return 'No history';
  if (delta === 0) return 'No change (30d)';
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toFixed(1)} kg (30d)`;
}

export default function DashboardScreen(): React.JSX.Element {
  const { token, signOut } = useSession();
  const router = useRouter();

  const onSignOut = useCallback(async () => {
    await signOut();
    router.replace('/(auth)/login');
  }, [signOut, router]);
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [biometrics, setBiometrics] = useState<Biometric[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const [snap, bio] = await Promise.all([
        fetchDashboard(token),
        fetchBiometrics(token, 30).catch(() => [] as Biometric[]),
      ]);
      setSnapshot(snap);
      setBiometrics(bio);
    } catch {
      setError('Could not load your dashboard. Pull to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load();
  }, [load]);

  if (!token) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.logo}>FitOS</Text>
          <Text style={styles.emptyTitle}>Welcome</Text>
          <Text style={styles.emptyText}>Sign in to see your dashboard.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.emerald} />
        </View>
      </SafeAreaView>
    );
  }

  const goals = snapshot?.goals ?? null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.emerald}
          />
        }
      >
        <View style={styles.headerRow}>
          <Text style={styles.logo}>FitOS</Text>
          <Pressable onPress={() => void onSignOut()} hitSlop={8}>
            <Text style={styles.signOut}>Sign out</Text>
          </Pressable>
        </View>
        <Text style={styles.greeting}>Today</Text>
        {goals ? (
          <Text style={styles.goalLabel}>
            Goal: {GOAL_LABELS[goals.primaryGoal]}
          </Text>
        ) : (
          <Text style={styles.goalLabel}>No active goal set</Text>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <CalorieSummary
          consumed={snapshot?.todayCalories ?? 0}
          target={goals?.dailyCalorieTarget ?? null}
        />

        <View style={styles.statRow}>
          <StatCard
            label="Weight"
            value={
              snapshot?.latestWeightKg != null
                ? `${snapshot.latestWeightKg.toFixed(1)} kg`
                : '--'
            }
            hint={formatDelta(snapshot?.weightDeltaKg ?? null)}
            accent={theme.colors.white}
          />
          <StatCard
            label="Workouts"
            value={`${snapshot?.workoutsThisWeek ?? 0}`}
            hint="this week"
            accent={theme.colors.emerald}
          />
        </View>

        <WeightChart entries={biometrics} />

        <CoachCard
          recommendation={snapshot?.latestRecommendation ?? null}
          onPress={() => router.push('/coach')}
        />
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
    gap: theme.spacing.md,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    fontFamily: 'monospace',
    color: theme.colors.emerald,
    fontSize: 16,
    fontWeight: '700',
  },
  signOut: {
    color: theme.colors.muted,
    fontSize: 13,
  },
  greeting: {
    color: theme.colors.white,
    fontSize: 30,
    fontWeight: '800',
  },
  goalLabel: {
    color: theme.colors.muted,
    fontSize: 13,
    marginBottom: theme.spacing.sm,
  },
  statRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  error: {
    color: theme.colors.red,
    fontSize: 13,
  },
  emptyTitle: {
    color: theme.colors.white,
    fontSize: 28,
    fontWeight: '700',
    marginTop: theme.spacing.md,
  },
  emptyText: {
    color: theme.colors.muted,
    fontSize: 14,
    marginTop: theme.spacing.sm,
  },
});
