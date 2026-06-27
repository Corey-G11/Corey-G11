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
import { Stack } from 'expo-router';
import { theme } from '../src/theme';
import { useSession } from '../src/store/session.store';
import { Button } from '../src/components/Button';
import {
  acknowledgeRecommendation,
  fetchRecommendations,
  generateRecommendation,
  submitRecommendationFeedback,
} from '../src/features/dashboard/api';
import type {
  Recommendation,
  SubmitFeedbackInput,
} from '../src/features/dashboard/types';

type FeedbackState = 'idle' | 'submitting' | 'done';

// Adherence presets the user taps after acting on a recommendation. A low
// adherence (or an explicit "Not for me") teaches the coach to ease off.
const FEEDBACK_OPTIONS: {
  label: string;
  input: SubmitFeedbackInput;
}[] = [
  { label: 'Followed it', input: { adherenceScore: 1, subjectiveEnergyScore: 4 } },
  { label: 'Partly', input: { adherenceScore: 0.5, subjectiveEnergyScore: 3 } },
  { label: 'Struggled', input: { adherenceScore: 0.2, subjectiveEnergyScore: 2 } },
  {
    label: 'Not for me',
    input: {
      adherenceScore: 0,
      subjectiveEnergyScore: 1,
      userRejectionReason: 'Dismissed by user',
    },
  },
];

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

function FeedbackSection({
  recId,
  state,
  onFeedback,
}: {
  recId: string;
  state: FeedbackState;
  onFeedback: (id: string, input: SubmitFeedbackInput) => void;
}): React.JSX.Element {
  if (state === 'done') {
    return (
      <Text style={styles.feedbackThanks}>
        Thanks — the coach will tune your next insight.
      </Text>
    );
  }
  return (
    <View style={styles.feedbackBlock}>
      <Text style={styles.feedbackPrompt}>How did it go?</Text>
      <View style={styles.feedbackRow}>
        {FEEDBACK_OPTIONS.map((opt) => (
          <Pressable
            key={opt.label}
            style={({ pressed }) => [
              styles.chip,
              pressed && styles.chipPressed,
              state === 'submitting' && styles.chipDisabled,
            ]}
            disabled={state === 'submitting'}
            onPress={() => onFeedback(recId, opt.input)}
          >
            <Text style={styles.chipText}>{opt.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function RecommendationItem({
  rec,
  onAcknowledge,
  acknowledging,
  feedbackState,
  onFeedback,
}: {
  rec: Recommendation;
  onAcknowledge: (id: string) => void;
  acknowledging: boolean;
  feedbackState: FeedbackState;
  onFeedback: (id: string, input: SubmitFeedbackInput) => void;
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
      ) : (
        <FeedbackSection
          recId={rec.id}
          state={feedbackState}
          onFeedback={onFeedback}
        />
      )}
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
  const [feedback, setFeedback] = useState<Record<string, FeedbackState>>({});
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

  const onFeedback = useCallback(
    async (id: string, input: SubmitFeedbackInput) => {
      if (!token) return;
      setFeedback((prev) => ({ ...prev, [id]: 'submitting' }));
      setError(null);
      try {
        await submitRecommendationFeedback(token, id, input);
        setFeedback((prev) => ({ ...prev, [id]: 'done' }));
      } catch {
        setError('Could not save your feedback. Try again.');
        setFeedback((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
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
          Adaptive insights from your goal and recent weight trend — your
          feedback tunes how aggressive the next plan is.
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
              feedbackState={feedback[rec.id] ?? 'idle'}
              onFeedback={onFeedback}
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
  feedbackBlock: {
    marginTop: theme.spacing.md,
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    paddingTop: theme.spacing.md,
  },
  feedbackPrompt: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
  },
  feedbackRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  chip: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
  },
  chipPressed: {
    borderColor: theme.colors.emerald,
  },
  chipDisabled: {
    opacity: 0.5,
  },
  chipText: {
    color: theme.colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
  feedbackThanks: {
    color: theme.colors.emerald,
    fontSize: 13,
    marginTop: theme.spacing.md,
  },
});
