import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSession } from '../../src/store/session.store';
import { fetchTemplates } from '../../src/features/templates/api';
import type { ProgramTemplate } from '../../src/features/templates/types';
import { theme } from '../../src/theme';

export default function TemplatesScreen(): React.JSX.Element {
  const router = useRouter();
  const { token } = useSession();
  const [templates, setTemplates] = useState<ProgramTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setError(undefined);
    try {
      setTemplates(await fetchTemplates(token));
    } catch {
      setError('Could not load program templates.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.logo}>FitOS</Text>
        <Text style={styles.title}>Program Templates</Text>
        <Text style={styles.subtitle}>Adopt a proven plan to get started fast.</Text>

        {!token ? (
          <Text style={styles.muted}>Sign in to browse templates.</Text>
        ) : loading ? (
          <ActivityIndicator color={theme.colors.emerald} style={styles.loader} />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          templates.map((t) => (
            <Pressable
              key={t.id}
              style={styles.card}
              onPress={() => router.push(`/programs/${t.id}`)}
            >
              <Text style={styles.cardName}>{t.name}</Text>
              <Text style={styles.cardDesc}>{t.description}</Text>
              <Text style={styles.cardMeta}>
                {t.daysPerWeek} days/week · {t.durationWeeks} weeks
              </Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.black },
  content: { padding: theme.spacing.lg },
  logo: {
    fontFamily: 'monospace',
    color: theme.colors.emerald,
    fontSize: 16,
    fontWeight: '700',
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
    marginBottom: theme.spacing.lg,
  },
  loader: { marginTop: theme.spacing.xl },
  muted: { color: theme.colors.muted, fontSize: 14, marginTop: theme.spacing.lg },
  error: { color: theme.colors.red, fontSize: 13, marginTop: theme.spacing.lg },
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  cardName: { color: theme.colors.white, fontSize: 18, fontWeight: '700' },
  cardDesc: {
    color: theme.colors.muted,
    fontSize: 13,
    marginTop: theme.spacing.xs,
  },
  cardMeta: {
    color: theme.colors.emerald,
    fontSize: 12,
    marginTop: theme.spacing.sm,
  },
});
