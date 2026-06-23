import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../../theme';

interface MacroSummaryBarProps {
  label: string;
  consumed: number;
  target: number | null;
  unit?: string;
  color?: string;
}

export function MacroSummaryBar({
  label,
  consumed,
  target,
  unit = 'g',
  color = theme.colors.emerald,
}: MacroSummaryBarProps): React.JSX.Element {
  const hasTarget = target !== null && target > 0;
  const pct = hasTarget
    ? Math.max(0, Math.min(1, consumed / (target as number)))
    : 0;
  const over = hasTarget && consumed > (target as number);

  return (
    <View style={styles.row}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>
          {consumed}
          {hasTarget ? (
            <Text style={styles.target}>
              {' / '}
              {target}
              {unit}
            </Text>
          ) : (
            <Text style={styles.target}>{unit}</Text>
          )}
        </Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              width: `${pct * 100}%`,
              backgroundColor: over ? theme.colors.amber : color,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: theme.spacing.xs,
  },
  label: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  value: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  target: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: '400',
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.border,
    overflow: 'hidden',
  },
  fill: {
    height: 6,
    borderRadius: 3,
  },
});
