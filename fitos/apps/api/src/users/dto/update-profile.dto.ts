import { IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import type { ActivityLevel } from '@fitos/shared';

const ACTIVITY_LEVELS: ActivityLevel[] = [
  'sedentary',
  'light',
  'moderate',
  'active',
  'very_active',
];

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @IsOptional()
  @IsIn(['male', 'female', 'other'])
  gender?: 'male' | 'female' | 'other';

  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(250)
  heightCm?: number;

  @IsOptional()
  @IsIn(ACTIVITY_LEVELS)
  activityLevel?: ActivityLevel;
}
