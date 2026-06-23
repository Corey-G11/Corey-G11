import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ProgramDayDto {
  @IsInt()
  @Min(1)
  @Max(31)
  dayNumber!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;
}

export class CreateProgramDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsInt()
  @Min(1)
  @Max(104)
  durationWeeks!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ProgramDayDto)
  days!: ProgramDayDto[];
}
