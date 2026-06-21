import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const COMPLETION_STATUSES = [
  'pending',
  'completed',
  'skipped',
  'partially_completed',
] as const;

export type CompletionStatus = (typeof COMPLETION_STATUSES)[number];

export class CreateLogDto {
  @IsOptional()
  @IsUUID()
  scheduledWorkoutId?: string;

  @IsOptional()
  @IsIn(COMPLETION_STATUSES)
  status?: CompletionStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  totalDurationMinutes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  userNotes?: string;
}
