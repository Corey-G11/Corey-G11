import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { FitnessGoal, MacroTargets } from '@fitos/shared';
import { Button } from '../../src/components/Button';
import { useOnboarding } from '../../src/store/onboarding.store';
import { theme } from '../../src/theme';

const PLACEHOLDER: MacroTargets = {
  dailyCalories: 2100,
  proteinG: 165,
  carbsG: 200,
  fatG: 60,
  goal: 'lose_fat',
  tdee: 2600,
  bmr: 1780,
};

const GOAL_LABELS: Record<FitnessGoal, string> = {
  lose_fat: 'Lose Fat',
  build_muscle: 'Build Muscle',
  athletic_performance: 'Athletic Performance',
  health_maintenance: 'Health & Maintenance',
};

interface MacroBarProps {
  label: string;
  grams: number;
  pct: number;
  color: string;
}

function MacroBar({ label, grams, pct, color }: MacroBarProps): React.JSX.Element {
  return (
    <View style={styles.macroRow}>
      <View style={styles.macroHeader}>
        <Text style={styles.macroLabel}>{label}</Text>
        <Text style={styles.macroValue}>{grams}g</Text>
      </View>
      <View style={styles.barTrack}>
        <View
          style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]}
        />
      </View>
    </View>
  );
}

export default function Results(): React.JSX.Element {
  const router = useRouter();
  const { macros } = useOnboarding();
  const m = macros ?? PLACEHOLDER;

  const totalGrams = m.proteinG + m.carbsG + m.fatG || 1;
  const pct = (g: number): number => Math.round((g / totalGrams) * 100);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.logo}>FitOS</Text>
        <Text style={styles.title}>Your FitOS Plan is ready.</Text>

        <View style={styles.calorieBlock}>
          <Text style={styles.calorieNumber}>
            {m.dailyCalories.toLocaleString('en-US')}
          </Text>
          <Text style={styles.calorieSubtitle}>calories / day</Text>
          <Text style={styles.goalLabel}>{GOAL_LABELS[m.goal]}</Text>
        </View>

        <View style={styles.macros}>
          <MacroBar
            label="Protein"
            grams={m.proteinG}
            pct={pct(m.proteinG)}
            color={theme.colors.emerald}
          />
          <MacroBar
            label="Carbs"
            grams={m.carbsG}
            pct={pct(m.carbsG)}
            color={theme.colors.amber}
          />
          <MacroBar
            label="Fat"
            grams={m.fatG}
            pct={pct(m.fatG)}
            color={theme.colors.orange}
          />
        </View>

        <Text style={styles.footnote}>
          Based on TDEE of {m.tdee.toLocaleString('en-US')} cal · BMR{' '}
          {m.bmr.toLocaleString('en-US')} cal
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="Start My Journey →"
          onPress={() => router.replace('/(tabs)')}
        />
      </View>
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
    paddingTop: theme.spacing.xl,
  },
  logo: {
    fontFamily: 'monospace',
    color: theme.colors.emerald,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  title: {
    color: theme.colors.white,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
  calorieBlock: {
    alignItems: 'center',
    marginVertical: theme.spacing.xl,
  },
  calorieNumber: {
    color: theme.colors.emerald,
    fontSize: 64,
    fontWeight: '800',
  },
  calorieSubtitle: {
    color: theme.colors.emerald,
    fontSize: 14,
    letterSpacing: 1,
  },
  goalLabel: {
    color: theme.colors.muted,
    fontSize: 14,
    marginTop: theme.spacing.sm,
  },
  macros: {
    marginTop: theme.spacing.md,
  },
  macroRow: {
    marginBottom: theme.spacing.lg,
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  macroLabel: {
    color: theme.colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  macroValue: {
    color: theme.colors.muted,
    fontSize: 15,
  },
  barTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.border,
    overflow: 'hidden',
  },
  barFill: {
    height: 10,
    borderRadius: 5,
  },
  footnote: {
    color: theme.colors.muted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: theme.spacing.md,
  },
  footer: {
    padding: theme.spacing.lg,
  },
});
