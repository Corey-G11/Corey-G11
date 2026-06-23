import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import {
  ActivityLevel,
  FitnessGoal,
} from '@fitos/shared';

const ACTIVITY_LEVELS: ActivityLevel[] = [
  'sedentary',
  'light',
  'moderate',
  'active',
  'very_active',
];

const FITNESS_GOALS: FitnessGoal[] = [
  'lose_fat',
  'build_muscle',
  'athletic_performance',
  'health_maintenance',
];

export class OnboardingDto {
  @IsString()
  firstName!: string;

  @IsString()
  dateOfBirth!: string;

  @IsIn(['male', 'female', 'other'])
  gender!: 'male' | 'female' | 'other';

  @IsNumber()
  @Min(100)
  @Max(250)
  heightCm!: number;

  @IsNumber()
  @Min(30)
  @Max(300)
  weightKg!: number;

  @IsIn(ACTIVITY_LEVELS)
  activityLevel!: ActivityLevel;

  @IsIn(FITNESS_GOALS)
  primaryGoal!: FitnessGoal;

  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(300)
  targetWeightKg?: number;

  @IsInt()
  @Min(1)
  @Max(7)
  trainingDaysPerWeek!: number;

  @IsIn([30, 45, 60, 90])
  sessionMinutes!: 30 | 45 | 60 | 90;

  @IsArray()
  @IsString({ each: true })
  injuries!: string[];

  @IsArray()
  @IsString({ each: true })
  foodLikes!: string[];

  @IsArray()
  @IsString({ each: true })
  foodDislikes!: string[];

  @IsArray()
  @IsString({ each: true })
  dietaryRules!: string[];
}
