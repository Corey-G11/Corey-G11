import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { COMPLETION_STATUSES, CompletionStatus } from './create-log.dto';

export class UpdateLogDto {
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
