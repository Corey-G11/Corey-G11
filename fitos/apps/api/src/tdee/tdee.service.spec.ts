import { FitnessGoal } from '@fitos/shared';
import { TdeeService, TdeeInput } from './tdee.service';

describe('TdeeService', () => {
  let service: TdeeService;

  beforeEach(() => {
    service = new TdeeService();
  });

  it('computes Mifflin-St Jeor BMR/TDEE for a male lose_fat case', () => {
    const result = service.calculate({
      gender: 'male',
      weightKg: 80,
      heightCm: 180,
      age: 30,
      activityLevel: 'moderate',
      primaryGoal: 'lose_fat',
    });

    // BMR = 10*80 + 6.25*180 - 5*30 + 5 = 1780
    expect(result.bmr).toBe(1780);
    // TDEE = round(1780 * 1.55) = 2759
    expect(result.tdee).toBe(2759);
    // dailyCalories = TDEE - 500 = 2259
    expect(result.dailyCalories).toBe(2259);
    expect(result.proteinG).toBe(176); // 2.2 * 80
    expect(result.fatG).toBe(63);
    expect(result.carbsG).toBe(247);
    expect(result.goal).toBe('lose_fat');
  });

  it('applies a caloric surplus for a female build_muscle case', () => {
    const result = service.calculate({
      gender: 'female',
      weightKg: 60,
      heightCm: 165,
      age: 25,
      activityLevel: 'active',
      primaryGoal: 'build_muscle',
    });

    // BMR = 10*60 + 6.25*165 - 5*25 - 161 = 1345.25 -> 1345
    expect(result.bmr).toBe(1345);
    // TDEE = round(1345.25 * 1.725) = 2321
    expect(result.tdee).toBe(2321);
    // dailyCalories = TDEE + 300 (surplus applied)
    expect(result.dailyCalories).toBe(result.tdee + 300);
    expect(result.dailyCalories).toBe(2621);
    expect(result.proteinG).toBe(120); // 2.0 * 60
  });

  it('averages male and female formulas for gender "other"', () => {
    const male = service.calculate({
      gender: 'male',
      weightKg: 70,
      heightCm: 175,
      age: 40,
      activityLevel: 'sedentary',
      primaryGoal: 'health_maintenance',
    });
    const female = service.calculate({
      gender: 'female',
      weightKg: 70,
      heightCm: 175,
      age: 40,
      activityLevel: 'sedentary',
      primaryGoal: 'health_maintenance',
    });
    const other = service.calculate({
      gender: 'other',
      weightKg: 70,
      heightCm: 175,
      age: 40,
      activityLevel: 'sedentary',
      primaryGoal: 'health_maintenance',
    });

    expect(other.bmr).toBe(Math.round((male.bmr + female.bmr) / 2));
  });

  describe.each<FitnessGoal>([
    'lose_fat',
    'build_muscle',
    'athletic_performance',
    'health_maintenance',
  ])('goal: %s', (goal) => {
    const base: TdeeInput = {
      gender: 'male',
      weightKg: 75,
      heightCm: 178,
      age: 28,
      activityLevel: 'moderate',
      primaryGoal: goal,
    };

    it('produces sane positive integer macros', () => {
      const r = service.calculate(base);
      expect(Number.isInteger(r.proteinG)).toBe(true);
      expect(Number.isInteger(r.carbsG)).toBe(true);
      expect(Number.isInteger(r.fatG)).toBe(true);
      expect(r.proteinG).toBeGreaterThan(0);
      expect(r.carbsG).toBeGreaterThan(0);
      expect(r.fatG).toBeGreaterThan(0);
      expect(r.dailyCalories).toBeGreaterThan(0);
      expect(r.goal).toBe(goal);

      // Macro calories should roughly reconcile to dailyCalories (within rounding).
      const macroCalories = r.proteinG * 4 + r.carbsG * 4 + r.fatG * 9;
      expect(Math.abs(macroCalories - r.dailyCalories)).toBeLessThanOrEqual(6);
    });
  });

  it('applies the correct calorie delta per goal', () => {
    const base = {
      gender: 'male' as const,
      weightKg: 80,
      heightCm: 180,
      age: 30,
      activityLevel: 'moderate' as const,
    };
    const tdee = service.calculate({ ...base, primaryGoal: 'lose_fat' }).tdee;

    expect(service.calculate({ ...base, primaryGoal: 'lose_fat' }).dailyCalories).toBe(tdee - 500);
    expect(service.calculate({ ...base, primaryGoal: 'build_muscle' }).dailyCalories).toBe(tdee + 300);
    expect(service.calculate({ ...base, primaryGoal: 'athletic_performance' }).dailyCalories).toBe(tdee + 100);
    expect(service.calculate({ ...base, primaryGoal: 'health_maintenance' }).dailyCalories).toBe(tdee);
  });
});
