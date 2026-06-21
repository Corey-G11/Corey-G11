import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../../theme';
import type { Recommendation } from '../types';

interface CoachCardProps {
  recommendation: Recommendation | null;
  onPress?: () => void;
}

function adjustmentLabel(adj: number): string {
  if (adj === 0) return 'No calorie change';
  return adj > 0 ? `+${adj} kcal / day` : `${adj} kcal / day`;
}

export function CoachCard({
  recommendation,
  onPress,
}: CoachCardProps): React.JSX.Element {
  const action = recommendation?.recommendedAction;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      <View style={styles.headerRow}>
        <Text style={styles.badge}>AI COACH</Text>
        <Text style={styles.link}>View all ›</Text>
      </View>

      {action ? (
        <>
          <Text style={styles.title}>{action.title}</Text>
          <Text style={styles.message} numberOfLines={3}>
            {action.message}
          </Text>
          <Text style={styles.adjustment}>
            {adjustmentLabel(action.suggestedCalorieAdjustment)}
          </Text>
        </>
      ) : (
        <>
          <Text style={styles.title}>No insights yet</Text>
          <Text style={styles.message}>
            Generate your first coach insight from the Coach screen.
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.emerald,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
  },
  pressed: {
    opacity: 0.85,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  badge: {
    color: theme.colors.emerald,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  link: {
    color: theme.colors.muted,
    fontSize: 12,
  },
  title: {
    color: theme.colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  message: {
    color: theme.colors.white,
    opacity: 0.8,
    fontSize: 14,
    marginTop: theme.spacing.xs,
    lineHeight: 20,
  },
  adjustment: {
    color: theme.colors.emerald,
    fontSize: 13,
    fontWeight: '700',
    marginTop: theme.spacing.sm,
  },
});
