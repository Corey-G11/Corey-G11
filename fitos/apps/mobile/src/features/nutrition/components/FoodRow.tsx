import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../../theme';
import type { NutritionLog } from '../types';

interface FoodRowProps {
  log: NutritionLog;
  onDelete: (id: string) => void;
}

export function FoodRow({ log, onDelete }: FoodRowProps): React.JSX.Element {
  const { food, servingsConsumed } = log;
  const calories = Math.round(food.caloriesPerServing * servingsConsumed);
  const protein = Math.round(food.proteinPerServing * servingsConsumed);
  const carbs = Math.round(food.carbsPerServing * servingsConsumed);
  const fat = Math.round(food.fatPerServing * servingsConsumed);

  return (
    <View style={styles.container}>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {food.name}
        </Text>
        <Text style={styles.meta}>
          {servingsConsumed % 1 === 0
            ? servingsConsumed
            : servingsConsumed.toFixed(2)}{' '}
          serving{servingsConsumed === 1 ? '' : 's'}
          {food.brand ? ` · ${food.brand}` : ''}
        </Text>
        <Text style={styles.macros}>
          {calories} kcal · P {protein}g · C {carbs}g · F {fat}g
        </Text>
      </View>
      <Pressable
        onPress={() => onDelete(log.id)}
        hitSlop={10}
        style={({ pressed }) => [styles.delete, pressed ? styles.pressed : null]}
        accessibilityLabel="Remove food"
      >
        <Text style={styles.deleteText}>×</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  info: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  name: {
    color: theme.colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  meta: {
    color: theme.colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  macros: {
    color: theme.colors.emerald,
    fontSize: 12,
    marginTop: 4,
  },
  delete: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pressed: {
    opacity: 0.6,
  },
  deleteText: {
    color: theme.colors.red,
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '700',
  },
});
