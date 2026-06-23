import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateFoodDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  barcode?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(2000)
  servingSizeG?: number;

  @IsInt()
  @Min(0)
  @Max(10000)
  caloriesPerServing!: number;

  @IsNumber()
  @Min(0)
  @Max(2000)
  proteinPerServing!: number;

  @IsNumber()
  @Min(0)
  @Max(2000)
  carbsPerServing!: number;

  @IsNumber()
  @Min(0)
  @Max(2000)
  fatPerServing!: number;
}
