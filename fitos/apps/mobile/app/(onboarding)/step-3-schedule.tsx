import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { ActivityLevel } from '@fitos/shared';
import { SelectCard } from '../../src/components/SelectCard';
import { OnboardingLayout } from '../../src/components/OnboardingLayout';
import { useOnboarding } from '../../src/store/onboarding.store';
import { theme } from '../../src/theme';

const TOTAL_STEPS = 5;

const ACTIVITY: { value: ActivityLevel; title: string; subtitle: string }[] = [
  { value: 'sedentary', title: 'Sedentary', subtitle: 'Little to no exercise' },
  { value: 'light', title: 'Light', subtitle: '1–2×/wk' },
  { value: 'moderate', title: 'Moderate', subtitle: '3–4×/wk' },
  { value: 'active', title: 'Active', subtitle: '5–6×/wk' },
  { value: 'very_active', title: 'Very Active', subtitle: 'Daily / physical job' },
];

const SESSIONS: (30 | 45 | 60 | 90)[] = [30, 45, 60, 90];
const DAYS = [1, 2, 3, 4, 5, 6, 7];

function fieldLabel(text: string): React.JSX.Element {
  return <Text style={styles.label}>{text}</Text>;
}

export default function Step3Schedule(): React.JSX.Element {
  const router = useRouter();
  const { data, setFields } = useOnboarding();

  const [activity, setActivity] = useState<ActivityLevel | undefined>(
    data.activityLevel,
  );
  const [days, setDays] = useState<number | undefined>(data.trainingDaysPerWeek);
  const [session, setSession] = useState<30 | 45 | 60 | 90 | undefined>(
    data.sessionMinutes,
  );
  const [injuries, setInjuries] = useState<string>(
    (data.injuries ?? []).join(', '),
  );

  const canContinue = !!activity && !!days && !!session;

  const onContinue = (): void => {
    if (!activity || !days || !session) return;
    const parsedInjuries = injuries
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    setFields({
      activityLevel: activity,
      trainingDaysPerWeek: days,
      sessionMinutes: session,
      injuries: parsedInjuries,
    });
    router.push('/(onboarding)/step-4-food');
  };

  return (
    <OnboardingLayout
      step={3}
      totalSteps={TOTAL_STEPS}
      title="How does your week look?"
      onBack={() => router.back()}
      onContinue={onContinue}
      continueDisabled={!canContinue}
    >
      {fieldLabel('Activity Level')}
      {ACTIVITY.map((a) => (
        <SelectCard
          key={a.value}
          title={a.title}
          subtitle={a.subtitle}
          selected={activity === a.value}
          onPress={() => setActivity(a.value)}
        />
      ))}

      <View style={{ height: 16 }} />
      {fieldLabel('Training Days / Week')}
      <View style={styles.dayRow}>
        {DAYS.map((d) => (
          <Pressable
            key={d}
            onPress={() => setDays(d)}
            style={[styles.dayButton, days === d ? styles.dayButtonActive : null]}
          >
            <Text
              style={[styles.dayText, days === d ? styles.dayTextActive : null]}
            >
              {d}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={{ height: 16 }} />
      {fieldLabel('Session Length')}
      {SESSIONS.map((s) => (
        <SelectCard
          key={s}
          title={`${s} min`}
          selected={session === s}
          onPress={() => setSession(s)}
        />
      ))}

      <View style={{ height: 16 }} />
      {fieldLabel('Injuries / Limitations')}
      <TextInput
        value={injuries}
        onChangeText={setInjuries}
        placeholder="e.g. left knee, lower back (comma separated)"
        placeholderTextColor={theme.colors.muted}
        multiline
        style={styles.injuryInput}
      />
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: theme.spacing.sm,
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayButton: {
    flex: 1,
    marginHorizontal: 3,
    aspectRatio: 1,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButtonActive: {
    borderColor: theme.colors.emerald,
    backgroundColor: theme.colors.emeraldGlow,
  },
  dayText: {
    color: theme.colors.muted,
    fontSize: 16,
    fontWeight: '600',
  },
  dayTextActive: {
    color: theme.colors.emerald,
  },
  injuryInput: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    color: theme.colors.white,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
