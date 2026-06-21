import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateSetDto {
  @IsUUID()
  exerciseId!: string;

  @IsInt()
  @Min(0)
  setIndex!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  targetReps?: number;

  @IsInt()
  @Min(0)
  @Max(1000)
  actualReps!: number;

  @IsNumber()
  @Min(0)
  @Max(9999.99)
  weightKg!: number;

  @IsOptional()
  @IsNumber()
  @Min(1.0)
  @Max(10.0)
  rpe?: number;

  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;
}
