import { Injectable } from '@nestjs/common';
import {
  ACTIVITY_MULTIPLIERS,
  ActivityLevel,
  FitnessGoal,
  MacroTargets,
} from '@fitos/shared';

export interface TdeeInput {
  gender: 'male' | 'female' | 'other';
  weightKg: number;
  heightCm: number;
  activityLevel: ActivityLevel;
  primaryGoal: FitnessGoal;
  dateOfBirth?: string;
  age?: number;
}

interface GoalConfig {
  calorieDelta: number;
  proteinPerKg: number;
  fatPct: number;
}

const GOAL_CONFIG: Record<FitnessGoal, GoalConfig> = {
  lose_fat: { calorieDelta: -500, proteinPerKg: 2.2, fatPct: 0.25 },
  build_muscle: { calorieDelta: 300, proteinPerKg: 2.0, fatPct: 0.25 },
  athletic_performance: { calorieDelta: 100, proteinPerKg: 1.8, fatPct: 0.2 },
  health_maintenance: { calorieDelta: 0, proteinPerKg: 1.6, fatPct: 0.3 },
};

@Injectable()
export class TdeeService {
  calculate(input: TdeeInput): MacroTargets {
    const age = input.age ?? this.computeAge(input.dateOfBirth);
    const bmrRaw = this.calculateBmr(
      input.gender,
      input.weightKg,
      input.heightCm,
      age,
    );

    const multiplier = ACTIVITY_MULTIPLIERS[input.activityLevel];
    const tdee = Math.round(bmrRaw * multiplier);

    const config = GOAL_CONFIG[input.primaryGoal];
    const dailyCalories = tdee + config.calorieDelta;

    const proteinG = Math.round(config.proteinPerKg * input.weightKg);
    const fatG = Math.round((config.fatPct * dailyCalories) / 9);
    const carbCalories = dailyCalories - proteinG * 4 - fatG * 9;
    const carbsG = Math.round(Math.max(carbCalories, 0) / 4);

    return {
      dailyCalories,
      proteinG,
      carbsG,
      fatG,
      goal: input.primaryGoal,
      tdee,
      bmr: Math.round(bmrRaw),
    };
  }

  private calculateBmr(
    gender: 'male' | 'female' | 'other',
    weightKg: number,
    heightCm: number,
    age: number,
  ): number {
    const male = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
    const female = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;

    switch (gender) {
      case 'male':
        return male;
      case 'female':
        return female;
      default:
        return (male + female) / 2;
    }
  }

  private computeAge(dateOfBirth?: string): number {
    if (!dateOfBirth) {
      return 30;
    }
    const dob = new Date(dateOfBirth);
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const monthDiff = now.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
      age -= 1;
    }
    return age;
  }
}
