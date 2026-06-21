import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import type { FitnessGoal } from '@fitos/shared';
import { SelectCard } from '../../src/components/SelectCard';
import { Input } from '../../src/components/Input';
import { OnboardingLayout } from '../../src/components/OnboardingLayout';
import { useOnboarding } from '../../src/store/onboarding.store';

const TOTAL_STEPS = 5;

const GOALS: { value: FitnessGoal; icon: string; title: string; subtitle: string }[] = [
  { value: 'lose_fat', icon: '🔥', title: 'Lose Fat', subtitle: 'Caloric deficit, high protein' },
  { value: 'build_muscle', icon: '💪', title: 'Build Muscle', subtitle: 'Caloric surplus, progressive overload' },
  { value: 'athletic_performance', icon: '⚡', title: 'Athletic Performance', subtitle: 'Fuel for output' },
  { value: 'health_maintenance', icon: '❤️', title: 'Health & Maintenance', subtitle: 'Sustainable balance' },
];

export default function Step2Goals(): React.JSX.Element {
  const router = useRouter();
  const { data, setFields } = useOnboarding();

  const [goal, setGoal] = useState<FitnessGoal | undefined>(data.primaryGoal);
  const [targetWeight, setTargetWeight] = useState<string>(
    data.targetWeightKg ? String(data.targetWeightKg) : '',
  );
  const [error, setError] = useState<string | undefined>();

  const showTargetWeight = goal === 'lose_fat' || goal === 'build_muscle';

  const onContinue = (): void => {
    if (!goal) {
      setError('Please pick a goal');
      return;
    }
    if (showTargetWeight && targetWeight) {
      const n = Number(targetWeight);
      if (Number.isNaN(n) || n < 30 || n > 300) {
        setError('Target weight must be 30–300 kg');
        return;
      }
    }
    setFields({
      primaryGoal: goal,
      targetWeightKg:
        showTargetWeight && targetWeight ? Number(targetWeight) : undefined,
    });
    router.push('/(onboarding)/step-3-schedule');
  };

  return (
    <OnboardingLayout
      step={2}
      totalSteps={TOTAL_STEPS}
      title="What's your main goal?"
      subtitle="We'll calibrate your macros around it."
      onBack={() => router.back()}
      onContinue={onContinue}
      continueDisabled={!goal}
    >
      <View>
        {GOALS.map((g) => (
          <SelectCard
            key={g.value}
            icon={g.icon}
            title={g.title}
            subtitle={g.subtitle}
            selected={goal === g.value}
            onPress={() => {
              setGoal(g.value);
              setError(undefined);
            }}
          />
        ))}
      </View>

      {showTargetWeight ? (
        <View style={{ marginTop: 16 }}>
          <Input
            label="Target Weight (kg)"
            value={targetWeight}
            onChangeText={setTargetWeight}
            keyboardType="numeric"
            placeholder="75"
            error={error}
          />
        </View>
      ) : null}
    </OnboardingLayout>
  );
}
