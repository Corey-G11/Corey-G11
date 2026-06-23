import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button } from '../src/components/Button';
import { Input } from '../src/components/Input';
import { useSession } from '../src/store/session.store';
import { createBiometric } from '../src/features/dashboard/api';
import type { CreateBiometricInput } from '../src/features/dashboard/types';
import { theme } from '../src/theme';

function parseOptional(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isNaN(n) ? undefined : n;
}

export default function LogWeightScreen(): React.JSX.Element {
  const router = useRouter();
  const { token } = useSession();

  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [restingHr, setRestingHr] = useState('');
  const [sleep, setSleep] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const onSubmit = async (): Promise<void> => {
    const weightKg = Number(weight);
    if (Number.isNaN(weightKg) || weightKg < 30 || weightKg > 300) {
      setError('Enter a weight between 30 and 300 kg.');
      return;
    }
    if (!token) {
      router.replace('/(auth)/login');
      return;
    }

    const input: CreateBiometricInput = {
      weightKg,
      bodyFatPercentage: parseOptional(bodyFat),
      restingHeartRate: parseOptional(restingHr),
      sleepDurationMinutes: parseOptional(sleep),
    };

    setLoading(true);
    setError(undefined);
    try {
      await createBiometric(token, input);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your entry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.logo}>FitOS</Text>
        <Text style={styles.title}>Log a weigh-in.</Text>
        <Text style={styles.subtitle}>
          Track your weight to keep your coach insights sharp.
        </Text>

        <View style={styles.form}>
          <Input
            label="Weight (kg)"
            value={weight}
            onChangeText={setWeight}
            keyboardType="numeric"
            placeholder="80"
          />
          <Input
            label="Body Fat % (optional)"
            value={bodyFat}
            onChangeText={setBodyFat}
            keyboardType="numeric"
            placeholder="18"
          />
          <Input
            label="Resting HR (optional)"
            value={restingHr}
            onChangeText={setRestingHr}
            keyboardType="numeric"
            placeholder="58"
          />
          <Input
            label="Sleep (minutes, optional)"
            value={sleep}
            onChangeText={setSleep}
            keyboardType="numeric"
            placeholder="450"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.spacer} />
          <Button label="Save Entry" onPress={() => void onSubmit()} loading={loading} />
          <View style={styles.spacer} />
          <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.black,
  },
  container: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  logo: {
    fontFamily: 'monospace',
    color: theme.colors.emerald,
    fontSize: 16,
    fontWeight: '700',
    marginTop: theme.spacing.md,
  },
  title: {
    color: theme.colors.white,
    fontSize: 26,
    fontWeight: '800',
    marginTop: theme.spacing.sm,
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: 14,
    marginTop: theme.spacing.xs,
  },
  form: {
    marginTop: theme.spacing.xl,
  },
  spacer: {
    height: theme.spacing.sm,
  },
  error: {
    color: theme.colors.red,
    fontSize: 13,
    marginTop: theme.spacing.xs,
  },
});
