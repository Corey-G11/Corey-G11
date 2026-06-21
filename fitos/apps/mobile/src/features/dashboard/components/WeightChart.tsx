import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../../theme';
import type { Biometric } from '../types';

interface WeightChartProps {
  entries: Biometric[];
}

/**
 * Simple bar chart of recent weight. Expects entries ordered newest-first
 * (as the API returns them); renders oldest -> newest left to right.
 */
export function WeightChart({ entries }: WeightChartProps): React.JSX.Element {
  const data = [...entries].reverse().slice(-12);

  if (data.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Weight Trend</Text>
        <Text style={styles.empty}>Log your weight to see your trend here.</Text>
      </View>
    );
  }

  const weights = data.map((d) => d.weightKg);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Weight Trend</Text>
      <View style={styles.chart}>
        {data.map((d) => {
          const h = 12 + ((d.weightKg - min) / range) * 60;
          return (
            <View key={d.id} style={styles.barColumn}>
              <View style={[styles.bar, { height: h }]} />
            </View>
          );
        })}
      </View>
      <View style={styles.scaleRow}>
        <Text style={styles.scale}>{min.toFixed(1)} kg</Text>
        <Text style={styles.scale}>{max.toFixed(1)} kg</Text>
      </View>
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
  title: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: theme.spacing.md,
  },
  empty: {
    color: theme.colors.muted,
    fontSize: 13,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 80,
    gap: 4,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '70%',
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.emerald,
  },
  scaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.sm,
  },
  scale: {
    color: theme.colors.muted,
    fontSize: 11,
  },
});
