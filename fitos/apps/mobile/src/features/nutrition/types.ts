export interface Food {
  id: string;
  barcode: string | null;
  name: string;
  brand: string | null;
  servingSizeG: number;
  caloriesPerServing: number;
  proteinPerServing: number;
  carbsPerServing: number;
  fatPerServing: number;
}

export interface NutritionLog {
  id: string;
  userId: string;
  foodId: string;
  loggedAt: string;
  servingsConsumed: number;
  mealIndex: number;
  food: Food;
}

export interface MacroSet {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface DaySummary {
  date: string;
  consumed: MacroSet;
  targets: MacroSet | null;
  remaining: MacroSet | null;
}

export interface CreateFoodInput {
  name: string;
  brand?: string;
  servingSizeG?: number;
  caloriesPerServing: number;
  proteinPerServing: number;
  carbsPerServing: number;
  fatPerServing: number;
}

export interface CreateLogInput {
  foodId: string;
  servingsConsumed?: number;
  mealIndex: number;
}

export const MEALS: { index: number; label: string }[] = [
  { index: 1, label: 'Breakfast' },
  { index: 2, label: 'Lunch' },
  { index: 3, label: 'Dinner' },
  { index: 4, label: 'Snack' },
];

export function mealLabel(index: number): string {
  return MEALS.find((m) => m.index === index)?.label ?? 'Meal';
}
