import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '../../src/components/Button';
import { useSession } from '../../src/store/session.store';
import { adoptTemplate, fetchTemplate } from '../../src/features/templates/api';
import type { ProgramTemplate } from '../../src/features/templates/types';
import { theme } from '../../src/theme';

export default function TemplateDetailScreen(): React.JSX.Element {
  const router = useRouter();
  const { token } = useSession();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [template, setTemplate] = useState<ProgramTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [adopting, setAdopting] = useState(false);
  const [adopted, setAdopted] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const load = useCallback(async () => {
    if (!token || !id) {
      setLoading(false);
      return;
    }
    setError(undefined);
    try {
      setTemplate(await fetchTemplate(token, id));
    } catch {
      setError('Could not load this template.');
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onAdopt = async (): Promise<void> => {
    if (!token || !id) return;
    setAdopting(true);
    setError(undefined);
    try {
      await adoptTemplate(token, id);
      setAdopted(true);
      setTimeout(() => router.back(), 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not adopt this program.');
    } finally {
      setAdopting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.emerald} />
        </View>
      </SafeAreaView>
    );
  }

  if (!template) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.error}>{error ?? 'Template not found.'}</Text>
          <View style={styles.spacer} />
          <Button label="Back" variant="ghost" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.name}>{template.name}</Text>
        <Text style={styles.desc}>{template.description}</Text>
        <Text style={styles.meta}>
          {template.daysPerWeek} days/week · {template.durationWeeks} weeks
        </Text>

        {template.days.map((day) => (
          <View key={day.dayNumber} style={styles.dayCard}>
            <Text style={styles.dayName}>
              Day {day.dayNumber} · {day.name}
            </Text>
            <Text style={styles.dayFocus}>{day.focus}</Text>
            {day.exercises.map((ex) => (
              <Text key={ex} style={styles.exercise}>
                • {ex}
              </Text>
            ))}
          </View>
        ))}

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {adopted ? (
          <Text style={styles.success}>Program adopted! Find it under Workouts.</Text>
        ) : null}

        <View style={styles.spacer} />
        <Button
          label={adopted ? 'Adopted ✓' : 'Adopt this program'}
          onPress={() => void onAdopt()}
          loading={adopting}
          disabled={adopted}
        />
        <View style={styles.spacer} />
        <Button label="Back" variant="ghost" onPress={() => router.back()} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.black },
  content: { padding: theme.spacing.lg },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  name: { color: theme.colors.white, fontSize: 26, fontWeight: '800' },
  desc: {
    color: theme.colors.muted,
    fontSize: 14,
    marginTop: theme.spacing.xs,
  },
  meta: {
    color: theme.colors.emerald,
    fontSize: 12,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  dayCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  dayName: { color: theme.colors.white, fontSize: 16, fontWeight: '700' },
  dayFocus: {
    color: theme.colors.muted,
    fontSize: 12,
    marginTop: 2,
    marginBottom: theme.spacing.sm,
  },
  exercise: { color: theme.colors.white, fontSize: 14, marginTop: 2 },
  spacer: { height: theme.spacing.sm },
  error: { color: theme.colors.red, fontSize: 13, marginTop: theme.spacing.md },
  success: {
    color: theme.colors.emerald,
    fontSize: 13,
    marginTop: theme.spacing.md,
  },
});
