import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSession } from '../../src/store/session.store';
import { theme } from '../../src/theme';
import {
  createFood,
  createLog,
  searchFoods,
} from '../../src/features/nutrition/api';
import type { Food } from '../../src/features/nutrition/types';
import { MEALS } from '../../src/features/nutrition/types';

type Mode = 'search' | 'log' | 'create';

export default function NutritionSearchScreen(): React.JSX.Element {
  const router = useRouter();
  const { token } = useSession();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Food[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const [mode, setMode] = useState<Mode>('search');
  const [selected, setSelected] = useState<Food | null>(null);
  const [servings, setServings] = useState('1');
  const [mealIndex, setMealIndex] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // New-food form.
  const [newName, setNewName] = useState('');
  const [newCalories, setNewCalories] = useState('');
  const [newProtein, setNewProtein] = useState('');
  const [newCarbs, setNewCarbs] = useState('');
  const [newFat, setNewFat] = useState('');

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(
    async (q: string): Promise<void> => {
      if (!token) return;
      setSearching(true);
      setError(undefined);
      try {
        const res = await searchFoods(q, token);
        setResults(res);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Search failed.');
      } finally {
        setSearching(false);
      }
    },
    [token],
  );

  useEffect(() => {
    if (mode !== 'search') return;
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      void runSearch(query);
    }, 300);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query, runSearch, mode]);

  const onSelect = (food: Food): void => {
    setSelected(food);
    setServings('1');
    setMealIndex(1);
    setMode('log');
  };

  const onLog = async (): Promise<void> => {
    if (!token || !selected) return;
    const s = parseFloat(servings);
    if (!Number.isFinite(s) || s <= 0) {
      setError('Enter a valid serving amount.');
      return;
    }
    setSubmitting(true);
    setError(undefined);
    try {
      await createLog(
        { foodId: selected.id, servingsConsumed: s, mealIndex },
        token,
      );
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not log food.');
    } finally {
      setSubmitting(false);
    }
  };

  const onCreate = async (): Promise<void> => {
    if (!token) return;
    const calories = parseInt(newCalories, 10);
    const protein = parseFloat(newProtein);
    const carbs = parseFloat(newCarbs);
    const fat = parseFloat(newFat);
    if (!newName.trim()) {
      setError('Name is required.');
      return;
    }
    if (
      !Number.isFinite(calories) ||
      !Number.isFinite(protein) ||
      !Number.isFinite(carbs) ||
      !Number.isFinite(fat)
    ) {
      setError('Enter valid macro numbers.');
      return;
    }
    setSubmitting(true);
    setError(undefined);
    try {
      const food = await createFood(
        {
          name: newName.trim(),
          caloriesPerServing: calories,
          proteinPerServing: protein,
          carbsPerServing: carbs,
          fatPerServing: fat,
        },
        token,
      );
      onSelect(food);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create food.');
    } finally {
      setSubmitting(false);
    }
  };

  const goBackToSearch = (): void => {
    setMode('search');
    setSelected(null);
    setError(undefined);
  };

  if (!token) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <Text style={styles.muted}>Sign in to add foods.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Text style={styles.back}>‹ Back</Text>
          </Pressable>
          <Text style={styles.topTitle}>
            {mode === 'create'
              ? 'New Food'
              : mode === 'log'
                ? 'Log Food'
                : 'Add Food'}
          </Text>
          <View style={styles.backSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {mode === 'search' ? (
            <>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search foods…"
                placeholderTextColor={theme.colors.muted}
                autoFocus
                style={styles.searchInput}
              />

              {searching ? (
                <ActivityIndicator
                  color={theme.colors.emerald}
                  style={styles.searchSpinner}
                />
              ) : null}

              {results.map((food) => (
                <Pressable
                  key={food.id}
                  onPress={() => onSelect(food)}
                  style={({ pressed }) => [
                    styles.resultRow,
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <View style={styles.flex}>
                    <Text style={styles.resultName}>{food.name}</Text>
                    <Text style={styles.resultMeta}>
                      {food.caloriesPerServing} kcal · P{' '}
                      {food.proteinPerServing}g · C {food.carbsPerServing}g · F{' '}
                      {food.fatPerServing}g
                      {food.brand ? ` · ${food.brand}` : ''}
                    </Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              ))}

              {!searching && results.length === 0 ? (
                <View style={styles.noResults}>
                  <Text style={styles.muted}>
                    {query.trim()
                      ? 'No foods found.'
                      : 'Type to search the food dictionary.'}
                  </Text>
                </View>
              ) : null}

              <Pressable
                onPress={() => {
                  setMode('create');
                  setNewName(query.trim());
                  setError(undefined);
                }}
                style={({ pressed }) => [
                  styles.createLink,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text style={styles.createLinkText}>
                  + Create a new food
                </Text>
              </Pressable>
            </>
          ) : null}

          {mode === 'log' && selected ? (
            <>
              <View style={styles.selectedCard}>
                <Text style={styles.resultName}>{selected.name}</Text>
                <Text style={styles.resultMeta}>
                  Per serving: {selected.caloriesPerServing} kcal · P{' '}
                  {selected.proteinPerServing}g · C {selected.carbsPerServing}g ·
                  F {selected.fatPerServing}g
                </Text>
              </View>

              <Text style={styles.label}>Servings</Text>
              <TextInput
                value={servings}
                onChangeText={setServings}
                keyboardType="decimal-pad"
                placeholder="1"
                placeholderTextColor={theme.colors.muted}
                style={styles.input}
              />

              <Text style={styles.label}>Meal</Text>
              <View style={styles.mealRow}>
                {MEALS.map((meal) => {
                  const active = meal.index === mealIndex;
                  return (
                    <Pressable
                      key={meal.index}
                      onPress={() => setMealIndex(meal.index)}
                      style={[
                        styles.mealChip,
                        active ? styles.mealChipActive : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.mealChipText,
                          active ? styles.mealChipTextActive : null,
                        ]}
                      >
                        {meal.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                onPress={() => void onLog()}
                disabled={submitting}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  pressed && !submitting ? styles.pressed : null,
                  submitting ? styles.disabled : null,
                ]}
              >
                {submitting ? (
                  <ActivityIndicator color={theme.colors.black} />
                ) : (
                  <Text style={styles.primaryBtnText}>Add to Diary</Text>
                )}
              </Pressable>

              <Pressable onPress={goBackToSearch} style={styles.secondaryBtn}>
                <Text style={styles.secondaryBtnText}>Choose another food</Text>
              </Pressable>
            </>
          ) : null}

          {mode === 'create' ? (
            <>
              <Text style={styles.label}>Name</Text>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder="e.g. Grilled Chicken Breast"
                placeholderTextColor={theme.colors.muted}
                style={styles.input}
              />
              <Text style={styles.label}>Calories (per serving)</Text>
              <TextInput
                value={newCalories}
                onChangeText={setNewCalories}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={theme.colors.muted}
                style={styles.input}
              />
              <Text style={styles.label}>Protein (g)</Text>
              <TextInput
                value={newProtein}
                onChangeText={setNewProtein}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={theme.colors.muted}
                style={styles.input}
              />
              <Text style={styles.label}>Carbs (g)</Text>
              <TextInput
                value={newCarbs}
                onChangeText={setNewCarbs}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={theme.colors.muted}
                style={styles.input}
              />
              <Text style={styles.label}>Fat (g)</Text>
              <TextInput
                value={newFat}
                onChangeText={setNewFat}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={theme.colors.muted}
                style={styles.input}
              />

              <Pressable
                onPress={() => void onCreate()}
                disabled={submitting}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  pressed && !submitting ? styles.pressed : null,
                  submitting ? styles.disabled : null,
                ]}
              >
                {submitting ? (
                  <ActivityIndicator color={theme.colors.black} />
                ) : (
                  <Text style={styles.primaryBtnText}>Create & Continue</Text>
                )}
              </Pressable>

              <Pressable onPress={goBackToSearch} style={styles.secondaryBtn}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </Pressable>
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.black,
  },
  flex: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  back: {
    color: theme.colors.emerald,
    fontSize: 16,
    fontWeight: '600',
  },
  backSpacer: {
    width: 48,
  },
  topTitle: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl * 2,
  },
  searchInput: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    color: theme.colors.white,
    fontSize: 16,
    marginBottom: theme.spacing.md,
  },
  searchSpinner: {
    marginVertical: theme.spacing.md,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  resultName: {
    color: theme.colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  resultMeta: {
    color: theme.colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  chevron: {
    color: theme.colors.muted,
    fontSize: 22,
    marginLeft: theme.spacing.sm,
  },
  noResults: {
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  muted: {
    color: theme.colors.muted,
    fontSize: 14,
    textAlign: 'center',
  },
  createLink: {
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.emerald,
    borderRadius: theme.radius.md,
  },
  createLinkText: {
    color: theme.colors.emerald,
    fontSize: 15,
    fontWeight: '700',
  },
  selectedCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: theme.spacing.xs,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    color: theme.colors.white,
    fontSize: 16,
    marginBottom: theme.spacing.md,
  },
  mealRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  mealChip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  mealChipActive: {
    borderColor: theme.colors.emerald,
    backgroundColor: theme.colors.emeraldGlow,
  },
  mealChipText: {
    color: theme.colors.muted,
    fontSize: 13,
  },
  mealChipTextActive: {
    color: theme.colors.emerald,
  },
  primaryBtn: {
    minHeight: 52,
    borderRadius: 10,
    backgroundColor: theme.colors.emerald,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
  },
  primaryBtnText: {
    color: theme.colors.black,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
  },
  secondaryBtnText: {
    color: theme.colors.muted,
    fontSize: 14,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
  error: {
    color: theme.colors.red,
    fontSize: 13,
    marginBottom: theme.spacing.md,
  },
});
