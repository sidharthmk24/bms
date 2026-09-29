import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class DayCloseDto {
  @IsString()
  @IsOptional()
  closeDate?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  countedCash: number;

  @IsString()
  @IsOptional()
  note?: string;
}
