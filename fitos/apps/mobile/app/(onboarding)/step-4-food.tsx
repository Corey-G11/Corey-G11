import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import type { AuthResponse, MacroTargets, OnboardingData } from '@fitos/shared';
import { OnboardingLayout } from '../../src/components/OnboardingLayout';
import { useOnboarding } from '../../src/store/onboarding.store';
import { apiPost } from '../../src/api/client';
import { theme } from '../../src/theme';

const TOTAL_STEPS = 5;
const DIETARY_OPTIONS = [
  'Vegan',
  'Vegetarian',
  'Gluten-Free',
  'Dairy-Free',
  'Keto',
  'Halal',
  'Kosher',
];

const TEMP_EMAIL = 'user@fitos.app';
const TEMP_PASSWORD = 'FitOS2024!';

interface ChipInputProps {
  label: string;
  placeholder: string;
  items: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  variant: 'like' | 'dislike';
}

function ChipInput({
  label,
  placeholder,
  items,
  onAdd,
  onRemove,
  variant,
}: ChipInputProps): React.JSX.Element {
  const [text, setText] = useState('');
  const chipBorder =
    variant === 'like' ? theme.colors.emerald : theme.colors.red;

  return (
    <View style={{ marginBottom: theme.spacing.lg }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.muted}
        returnKeyType="done"
        onSubmitEditing={() => {
          const v = text.trim();
          if (v) {
            onAdd(v);
            setText('');
          }
        }}
        style={styles.input}
      />
      <View style={styles.chipRow}>
        {items.map((item) => (
          <Pressable
            key={item}
            onPress={() => onRemove(item)}
            style={[styles.chip, { borderColor: chipBorder }]}
          >
            <Text style={styles.chipText}>{item}</Text>
            <Text style={[styles.chipX, { color: chipBorder }]}> ×</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function Step4Food(): React.JSX.Element {
  const router = useRouter();
  const { data, setFields, setMacros, setAccessToken } = useOnboarding();

  const [likes, setLikes] = useState<string[]>(data.foodLikes ?? []);
  const [dislikes, setDislikes] = useState<string[]>(data.foodDislikes ?? []);
  const [rules, setRules] = useState<string[]>(data.dietaryRules ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const addUnique = (
    list: string[],
    setList: (v: string[]) => void,
    value: string,
  ): void => {
    if (!list.includes(value)) setList([...list, value]);
  };

  const toggleRule = (rule: string): void => {
    setRules((prev) =>
      prev.includes(rule) ? prev.filter((r) => r !== rule) : [...prev, rule],
    );
  };

  const buildOnboardingData = (): OnboardingData | null => {
    const {
      firstName,
      dateOfBirth,
      gender,
      heightCm,
      weightKg,
      activityLevel,
      primaryGoal,
      trainingDaysPerWeek,
      sessionMinutes,
    } = data;

    if (
      !firstName ||
      !dateOfBirth ||
      !gender ||
      heightCm === undefined ||
      weightKg === undefined ||
      !activityLevel ||
      !primaryGoal ||
      trainingDaysPerWeek === undefined ||
      sessionMinutes === undefined
    ) {
      return null;
    }

    return {
      firstName,
      dateOfBirth,
      gender,
      heightCm,
      weightKg,
      activityLevel,
      primaryGoal,
      targetWeightKg: data.targetWeightKg,
      trainingDaysPerWeek,
      sessionMinutes,
      injuries: data.injuries ?? [],
      foodLikes: likes,
      foodDislikes: dislikes,
      dietaryRules: rules,
    };
  };

  const onContinue = async (): Promise<void> => {
    setFields({ foodLikes: likes, foodDislikes: dislikes, dietaryRules: rules });

    const payload = buildOnboardingData();
    if (!payload) {
      setError('Some earlier steps are incomplete. Please go back and finish them.');
      return;
    }

    setLoading(true);
    setError(undefined);
    try {
      // Temporary auth — dedicated auth screens land in a Phase 1 extension.
      let auth: AuthResponse;
      try {
        auth = await apiPost<AuthResponse>('/auth/register', {
          email: TEMP_EMAIL,
          password: TEMP_PASSWORD,
          firstName: payload.firstName,
        });
      } catch {
        // Likely already registered — fall back to login.
        auth = await apiPost<AuthResponse>('/auth/login', {
          email: TEMP_EMAIL,
          password: TEMP_PASSWORD,
        });
      }
      setAccessToken(auth.accessToken);

      const macros = await apiPost<MacroTargets>(
        '/onboarding',
        payload,
        auth.accessToken,
      );
      setMacros(macros);
      router.push('/(onboarding)/results');
    } catch (e) {
      // Keep the flow demoable even when the API is unreachable.
      setError(
        e instanceof Error
          ? `${e.message} — showing a sample plan instead.`
          : 'Network error — showing a sample plan instead.',
      );
      setMacros(null);
      router.push('/(onboarding)/results');
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingLayout
      step={4}
      totalSteps={TOTAL_STEPS}
      title="Tell us about your diet."
      subtitle="Helps us personalize meals you'll actually eat."
      onBack={() => router.back()}
      onContinue={() => void onContinue()}
      continueLabel="Generate My Plan"
      loading={loading}
    >
      <ChipInput
        label="Foods You Love"
        placeholder="Type a food and press enter"
        items={likes}
        onAdd={(v) => addUnique(likes, setLikes, v)}
        onRemove={(v) => setLikes(likes.filter((x) => x !== v))}
        variant="like"
      />

      <ChipInput
        label="Foods You Avoid"
        placeholder="Type a food and press enter"
        items={dislikes}
        onAdd={(v) => addUnique(dislikes, setDislikes, v)}
        onRemove={(v) => setDislikes(dislikes.filter((x) => x !== v))}
        variant="dislike"
      />

      <Text style={styles.label}>Dietary Rules</Text>
      <View style={styles.chipRow}>
        {DIETARY_OPTIONS.map((opt) => {
          const active = rules.includes(opt);
          return (
            <Pressable
              key={opt}
              onPress={() => toggleRule(opt)}
              style={[styles.ruleChip, active ? styles.ruleChipActive : null]}
            >
              <Text
                style={[
                  styles.ruleChipText,
                  active ? styles.ruleChipTextActive : null,
                ]}
              >
                {opt}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
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
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    color: theme.colors.white,
    fontSize: 15,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  chipText: {
    color: theme.colors.white,
    fontSize: 13,
  },
  chipX: {
    fontSize: 15,
    fontWeight: '700',
  },
  ruleChip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  ruleChipActive: {
    borderColor: theme.colors.emerald,
    backgroundColor: theme.colors.emeraldGlow,
  },
  ruleChipText: {
    color: theme.colors.muted,
    fontSize: 13,
  },
  ruleChipTextActive: {
    color: theme.colors.emerald,
  },
  error: {
    color: theme.colors.red,
    fontSize: 13,
    marginTop: theme.spacing.md,
  },
});
