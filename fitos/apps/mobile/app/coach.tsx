import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { theme } from '../src/theme';
import { useSession } from '../src/store/session.store';
import { Button } from '../src/components/Button';
import {
  acknowledgeRecommendation,
  fetchRecommendations,
  generateRecommendation,
} from '../src/features/dashboard/api';
import type { Recommendation } from '../src/features/dashboard/types';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function adjustmentLabel(adj: number): string {
  if (adj === 0) return 'No calorie change';
  return adj > 0 ? `+${adj} kcal / day` : `${adj} kcal / day`;
}

function RecommendationItem({
  rec,
  onAcknowledge,
  acknowledging,
}: {
  rec: Recommendation;
  onAcknowledge: (id: string) => void;
  acknowledging: boolean;
}): React.JSX.Element {
  const action = rec.recommendedAction;
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.date}>{formatDate(rec.generatedAt)}</Text>
        {rec.isAcknowledged ? (
          <Text style={styles.ackBadge}>Acknowledged</Text>
        ) : null}
      </View>
      <Text style={styles.cardTitle}>{action.title}</Text>
      <Text style={styles.cardMessage}>{action.message}</Text>
      <Text style={styles.adjustment}>
        {adjustmentLabel(action.suggestedCalorieAdjustment)}
      </Text>
      {!rec.isAcknowledged ? (
        <View style={styles.ackButton}>
          <Button
            label="Got it"
            variant="ghost"
            onPress={() => onAcknowledge(rec.id)}
            loading={acknowledging}
          />
        </View>
      ) : null}
    </View>
  );
}

export default function CoachScreen(): React.JSX.Element {
  const { token } = useSession();
  const [items, setItems] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [ackingId, setAckingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const data = await fetchRecommendations(token);
      setItems(data);
    } catch {
      setError('Could not load recommendations. Pull to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const onGenerate = useCallback(async () => {
    if (!token) return;
    setGenerating(true);
    setError(null);
    try {
      const rec = await generateRecommendation(token);
      setItems((prev) => [rec, ...prev]);
    } catch {
      setError('Could not generate an insight. Try again.');
    } finally {
      setGenerating(false);
    }
  }, [token]);

  const onAcknowledge = useCallback(
    async (id: string) => {
      if (!token) return;
      setAckingId(id);
      try {
        const updated = await acknowledgeRecommendation(token, id);
        setItems((prev) => prev.map((r) => (r.id === id ? updated : r)));
      } catch {
        setError('Could not update that recommendation.');
      } finally {
        setAckingId(null);
      }
    },
    [token],
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load();
  }, [load]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ title: 'AI Coach' }} />
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
        <Text style={styles.heading}>AI Coach</Text>
        <Text style={styles.subheading}>
          Rule-based insights from your goal and recent weight trend.
        </Text>

        <View style={styles.generateButton}>
          <Button
            label="Generate insight"
            onPress={onGenerate}
            loading={generating}
            disabled={!token}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!token ? (
          <Text style={styles.empty}>Sign in to use the coach.</Text>
        ) : loading ? (
          <ActivityIndicator color={theme.colors.emerald} style={styles.loader} />
        ) : items.length === 0 ? (
          <Text style={styles.empty}>
            No insights yet. Tap &quot;Generate insight&quot; to create one.
          </Text>
        ) : (
          items.map((rec) => (
            <RecommendationItem
              key={rec.id}
              rec={rec}
              onAcknowledge={onAcknowledge}
              acknowledging={ackingId === rec.id}
            />
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
    gap: theme.spacing.md,
  },
  heading: {
    color: theme.colors.white,
    fontSize: 28,
    fontWeight: '800',
  },
  subheading: {
    color: theme.colors.muted,
    fontSize: 13,
  },
  generateButton: {
    marginTop: theme.spacing.sm,
  },
  loader: {
    marginTop: theme.spacing.xl,
  },
  error: {
    color: theme.colors.red,
    fontSize: 13,
  },
  empty: {
    color: theme.colors.muted,
    fontSize: 14,
    marginTop: theme.spacing.lg,
    textAlign: 'center',
  },
  card: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  date: {
    color: theme.colors.muted,
    fontSize: 12,
  },
  ackBadge: {
    color: theme.colors.emerald,
    fontSize: 11,
    fontWeight: '700',
  },
  cardTitle: {
    color: theme.colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  cardMessage: {
    color: theme.colors.white,
    opacity: 0.8,
    fontSize: 14,
    lineHeight: 20,
    marginTop: theme.spacing.xs,
  },
  adjustment: {
    color: theme.colors.emerald,
    fontSize: 13,
    fontWeight: '700',
    marginTop: theme.spacing.sm,
  },
  ackButton: {
    marginTop: theme.spacing.md,
  },
});
