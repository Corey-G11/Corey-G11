import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../../theme';

interface CalorieSummaryProps {
  consumed: number;
  target: number | null;
}

export function CalorieSummary({
  consumed,
  target,
}: CalorieSummaryProps): React.JSX.Element {
  const hasTarget = target !== null && target > 0;
  const pct = hasTarget ? Math.min(consumed / target, 1) : 0;
  const remaining = hasTarget ? Math.max(target - consumed, 0) : 0;
  const over = hasTarget && consumed > target;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Calories Today</Text>
        <Text style={styles.target}>
          {hasTarget ? `Target ${target} kcal` : 'No target set'}
        </Text>
      </View>

      <Text style={styles.bigValue}>
        {consumed}
        <Text style={styles.bigUnit}> kcal</Text>
      </Text>

      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              width: `${Math.round(pct * 100)}%`,
              backgroundColor: over ? theme.colors.amber : theme.colors.emerald,
            },
          ]}
        />
      </View>

      <Text style={styles.caption}>
        {hasTarget
          ? over
            ? `${consumed - target} kcal over target`
            : `${remaining} kcal remaining`
          : 'Set a goal to track your daily target'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  target: {
    color: theme.colors.muted,
    fontSize: 12,
  },
  bigValue: {
    color: theme.colors.emerald,
    fontSize: 40,
    fontWeight: '800',
    marginTop: theme.spacing.sm,
  },
  bigUnit: {
    color: theme.colors.muted,
    fontSize: 16,
    fontWeight: '600',
  },
  track: {
    height: 10,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
    marginTop: theme.spacing.md,
  },
  fill: {
    height: '100%',
    borderRadius: theme.radius.full,
  },
  caption: {
    color: theme.colors.muted,
    fontSize: 13,
    marginTop: theme.spacing.sm,
  },
});
