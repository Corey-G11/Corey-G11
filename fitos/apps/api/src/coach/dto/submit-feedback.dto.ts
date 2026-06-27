import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class SubmitFeedbackDto {
  @IsNumber()
  @Min(0)
  @Max(1)
  adherenceScore!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  subjectiveEnergyScore?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  userRejectionReason?: string;
}
