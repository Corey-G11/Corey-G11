import { IsInt, IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class CreateLogDto {
  @IsUUID()
  foodId!: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(100)
  servingsConsumed?: number;

  @IsInt()
  @Min(1)
  @Max(4)
  mealIndex!: number;
}
