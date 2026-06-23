import { IsOptional, IsString } from 'class-validator';

export class SearchFoodsDto {
  @IsOptional()
  @IsString()
  query?: string;
}
