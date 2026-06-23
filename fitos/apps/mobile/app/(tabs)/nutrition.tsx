import React, { useCallback, useState } from 'react';
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
import { useFocusEffect, useRouter } from 'expo-router';
import { useSession } from '../../src/store/session.store';
import { theme } from '../../src/theme';
import {
  deleteLog as apiDeleteLog,
  getLogs,
  getSummary,
  todayISO,
} from '../../src/features/nutrition/api';
import type { DaySummary, NutritionLog } from '../../src/features/nutrition/types';
import { MEALS } from '../../src/features/nutrition/types';
import { MacroSummaryBar } from '../../src/features/nutrition/components/MacroSummaryBar';
import { FoodRow } from '../../src/features/nutrition/components/FoodRow';

export default function NutritionScreen(): React.JSX.Element {
  const router = useRouter();
  const { token } = useSession();

  const [summary, setSummary] = useState<DaySummary | null>(null);
  const [logs, setLogs] = useState<NutritionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const load = useCallback(async (): Promise<void> => {
    if (!token) {
      setLoading(false);
      return;
    }
    setError(undefined);
    try {
      const date = todayISO();
      const [s, l] = await Promise.all([
        getSummary(date, token),
        getLogs(date, token),
      ]);
      setSummary(s);
      setLogs(l);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your diary.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  const onRefresh = useCallback((): void => {
    setRefreshing(true);
    void load();
  }, [load]);

  const onDelete = useCallback(
    async (id: string): Promise<void> => {
      if (!token) return;
      const prev = logs;
      setLogs((curr) => curr.filter((x) => x.id !== id));
      try {
        await apiDeleteLog(id, token);
        await load();
      } catch (e) {
        setLogs(prev);
        setError(e instanceof Error ? e.message : 'Could not remove that food.');
      }
    },
    [token, logs, load],
  );

  if (!token) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Nutrition</Text>
          <Text style={styles.emptyMuted}>
            Sign in to track your meals and macros.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const consumed = summary?.consumed;
  const targets = summary?.targets ?? null;

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
          <View>
            <Text style={styles.title}>Today</Text>
            <Text style={styles.subtitle}>Food diary</Text>
          </View>
          <Pressable
            onPress={() => router.push('/nutrition/search')}
            style={({ pressed }) => [
              styles.addBtn,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={styles.addBtnText}>+ Add Food</Text>
          </Pressable>
        </View>

        {loading && !summary ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={theme.colors.emerald} />
          </View>
        ) : (
          <>
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.card}>
              <View style={styles.caloriesRow}>
                <Text style={styles.caloriesValue}>
                  {consumed?.calories ?? 0}
                </Text>
                <Text style={styles.caloriesLabel}>
                  {targets
                    ? ` / ${targets.calories} kcal`
                    : ' kcal consumed'}
                </Text>
              </View>
              {targets ? (
                <Text style={styles.remaining}>
                  {Math.max(0, targets.calories - (consumed?.calories ?? 0))}{' '}
                  kcal remaining
                </Text>
              ) : (
                <Text style={styles.remaining}>No active goal set</Text>
              )}

              <View style={styles.divider} />

              <MacroSummaryBar
                label="Protein"
                consumed={consumed?.proteinG ?? 0}
                target={targets?.proteinG ?? null}
                color={theme.colors.emerald}
              />
              <MacroSummaryBar
                label="Carbs"
                consumed={consumed?.carbsG ?? 0}
                target={targets?.carbsG ?? null}
                color={theme.colors.blue}
              />
              <MacroSummaryBar
                label="Fat"
                consumed={consumed?.fatG ?? 0}
                target={targets?.fatG ?? null}
                color={theme.colors.orange}
              />
            </View>

            {logs.length === 0 ? (
              <View style={styles.emptyDiary}>
                <Text style={styles.emptyMuted}>
                  No foods logged yet. Tap “+ Add Food” to start.
                </Text>
              </View>
            ) : (
              MEALS.map((meal) => {
                const mealLogs = logs.filter((l) => l.mealIndex === meal.index);
                if (mealLogs.length === 0) return null;
                return (
                  <View key={meal.index} style={styles.mealSection}>
                    <Text style={styles.mealHeader}>{meal.label}</Text>
                    {mealLogs.map((log) => (
                      <FoodRow
                        key={log.id}
                        log={log}
                        onDelete={(id) => void onDelete(id)}
                      />
                    ))}
                  </View>
                );
              })
            )}
          </>
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
    paddingBottom: theme.spacing.xl * 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    color: theme.colors.white,
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: 13,
    marginTop: 2,
  },
  addBtn: {
    backgroundColor: theme.colors.emerald,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  addBtnText: {
    color: theme.colors.black,
    fontWeight: '700',
    fontSize: 14,
  },
  pressed: {
    opacity: 0.8,
  },
  loadingWrap: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  caloriesRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  caloriesValue: {
    color: theme.colors.emerald,
    fontSize: 36,
    fontWeight: '800',
  },
  caloriesLabel: {
    color: theme.colors.muted,
    fontSize: 15,
  },
  remaining: {
    color: theme.colors.muted,
    fontSize: 13,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
  mealSection: {
    marginBottom: theme.spacing.lg,
  },
  mealHeader: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: theme.colors.white,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: theme.spacing.sm,
  },
  emptyDiary: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  emptyTitle: {
    color: theme.colors.white,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: theme.spacing.sm,
  },
  emptyMuted: {
    color: theme.colors.muted,
    fontSize: 14,
    textAlign: 'center',
  },
  error: {
    color: theme.colors.red,
    fontSize: 13,
    marginBottom: theme.spacing.md,
  },
});
