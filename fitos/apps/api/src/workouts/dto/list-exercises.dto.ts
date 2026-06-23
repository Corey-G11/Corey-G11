import { IsOptional, IsString } from 'class-validator';

export class ListExercisesDto {
  @IsOptional()
  @IsString()
  muscle?: string;
}
