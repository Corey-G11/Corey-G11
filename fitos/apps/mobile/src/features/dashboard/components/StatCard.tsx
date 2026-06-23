import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../../theme';

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  accent?: string;
}

export function StatCard({
  label,
  value,
  hint,
  accent = theme.colors.white,
}: StatCardProps): React.JSX.Element {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: accent }]}>{value}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  label: {
    color: theme.colors.muted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: theme.spacing.xs,
  },
  hint: {
    color: theme.colors.muted,
    fontSize: 12,
    marginTop: theme.spacing.xs,
  },
});
