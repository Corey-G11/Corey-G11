import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import type { ActivityLevel } from '@fitos/shared';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { SelectCard } from '../../src/components/SelectCard';
import { useSession } from '../../src/store/session.store';
import { theme } from '../../src/theme';
import { fetchMe, updateProfile } from '../../src/features/profile/api';
import {
  ACTIVITY_OPTIONS,
  GOAL_LABELS,
  type MacroTargetsResponse,
  type MeResponse,
} from '../../src/features/profile/types';

export default function ProfileScreen(): React.JSX.Element {
  const router = useRouter();
  const { token, signOut } = useSession();

  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [savedMacros, setSavedMacros] = useState<MacroTargetsResponse | null>(
    null,
  );

  const [firstName, setFirstName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [heightCm, setHeightCm] = useState('');
  const [activityLevel, setActivityLevel] =
    useState<ActivityLevel>('sedentary');

  const hydrate = useCallback((data: MeResponse) => {
    setMe(data);
    setFirstName(data.first_name ?? '');
    setDateOfBirth(data.date_of_birth ? data.date_of_birth.slice(0, 10) : '');
    setGender(data.gender ?? 'male');
    setHeightCm(data.height_cm != null ? String(data.height_cm) : '');
    setActivityLevel(data.activity_level ?? 'sedentary');
  }, []);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setError(undefined);
    try {
      const data = await fetchMe(token);
      hydrate(data);
    } catch {
      setError('Could not load your profile.');
    } finally {
      setLoading(false);
    }
  }, [token, hydrate]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onSave = async (): Promise<void> => {
    if (!token) return;
    const height = Number(heightCm);
    if (Number.isNaN(height) || height < 100 || height > 250) {
      setError('Height must be between 100 and 250 cm.');
      return;
    }
    setSaving(true);
    setError(undefined);
    setSavedMacros(null);
    try {
      const result = await updateProfile(token, {
        firstName: firstName.trim() || undefined,
        dateOfBirth: dateOfBirth.trim() || undefined,
        gender,
        heightCm: height,
        activityLevel,
      });
      setSavedMacros(result.goals);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  };

  const onSignOut = useCallback(async () => {
    await signOut();
    router.replace('/(auth)/login');
  }, [signOut, router]);

  if (!token) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.logo}>FitOS</Text>
          <Text style={styles.emptyText}>Sign in to view your profile.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.emerald} />
        </View>
      </SafeAreaView>
    );
  }

  const macros = savedMacros ?? currentMacros(me);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.logo}>FitOS</Text>
        <Text style={styles.name}>{me?.first_name ?? 'Your profile'}</Text>
        <Text style={styles.email}>{me?.email}</Text>

        {macros ? (
          <View style={styles.macroCard}>
            <Text style={styles.macroCalories}>
              {macros.dailyCalories.toLocaleString('en-US')} cal/day
            </Text>
            {me?.primary_goal ? (
              <Text style={styles.macroGoal}>{GOAL_LABELS[me.primary_goal]}</Text>
            ) : null}
            <Text style={styles.macroLine}>
              P {macros.proteinG}g · C {macros.carbsG}g · F {macros.fatG}g
            </Text>
            <Text style={styles.macroFootnote}>
              TDEE {macros.tdee} · BMR {macros.bmr}
            </Text>
          </View>
        ) : null}

        <Text style={styles.sectionLabel}>Edit Profile</Text>
        <Input label="First Name" value={firstName} onChangeText={setFirstName} />
        <Input
          label="Date of Birth"
          value={dateOfBirth}
          onChangeText={setDateOfBirth}
          placeholder="YYYY-MM-DD"
        />

        <Text style={styles.fieldLabel}>Gender</Text>
        <SelectCard
          title="Male"
          selected={gender === 'male'}
          onPress={() => setGender('male')}
        />
        <SelectCard
          title="Female"
          selected={gender === 'female'}
          onPress={() => setGender('female')}
        />
        <SelectCard
          title="Other"
          selected={gender === 'other'}
          onPress={() => setGender('other')}
        />

        <View style={styles.spacer} />
        <Input
          label="Height (cm)"
          value={heightCm}
          onChangeText={setHeightCm}
          keyboardType="numeric"
        />

        <Text style={styles.fieldLabel}>Activity Level</Text>
        {ACTIVITY_OPTIONS.map((opt) => (
          <SelectCard
            key={opt.value}
            title={opt.label}
            selected={activityLevel === opt.value}
            onPress={() => setActivityLevel(opt.value)}
          />
        ))}

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {savedMacros ? (
          <Text style={styles.success}>Profile saved — targets recalculated.</Text>
        ) : null}

        <View style={styles.spacer} />
        <Button label="Save Changes" onPress={() => void onSave()} loading={saving} />
        <View style={styles.spacer} />
        <Button label="Sign Out" variant="ghost" onPress={() => void onSignOut()} />
      </ScrollView>
    </SafeAreaView>
  );
}

function currentMacros(me: MeResponse | null): MacroTargetsResponse | null {
  if (
    !me ||
    me.daily_calorie_target == null ||
    me.protein_target_g == null ||
    me.carbohydrate_target_g == null ||
    me.fat_target_g == null ||
    me.tdee == null ||
    me.bmr == null ||
    me.primary_goal == null
  ) {
    return null;
  }
  return {
    dailyCalories: me.daily_calorie_target,
    proteinG: me.protein_target_g,
    carbsG: me.carbohydrate_target_g,
    fatG: me.fat_target_g,
    goal: me.primary_goal,
    tdee: me.tdee,
    bmr: me.bmr,
  };
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
  logo: {
    fontFamily: 'monospace',
    color: theme.colors.emerald,
    fontSize: 16,
    fontWeight: '700',
  },
  name: {
    color: theme.colors.white,
    fontSize: 28,
    fontWeight: '800',
    marginTop: theme.spacing.sm,
  },
  email: { color: theme.colors.muted, fontSize: 14 },
  emptyText: {
    color: theme.colors.muted,
    fontSize: 14,
    marginTop: theme.spacing.sm,
  },
  macroCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  macroCalories: {
    color: theme.colors.emerald,
    fontSize: 22,
    fontWeight: '800',
  },
  macroGoal: { color: theme.colors.muted, fontSize: 13, marginTop: 2 },
  macroLine: { color: theme.colors.white, fontSize: 14, marginTop: theme.spacing.sm },
  macroFootnote: { color: theme.colors.muted, fontSize: 12, marginTop: 2 },
  sectionLabel: {
    color: theme.colors.white,
    fontSize: 18,
    fontWeight: '700',
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.md,
  },
  fieldLabel: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  spacer: { height: theme.spacing.sm },
  error: { color: theme.colors.red, fontSize: 13, marginTop: theme.spacing.md },
  success: {
    color: theme.colors.emerald,
    fontSize: 13,
    marginTop: theme.spacing.md,
  },
});
