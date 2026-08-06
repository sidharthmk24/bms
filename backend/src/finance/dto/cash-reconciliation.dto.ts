import {
  IsNumber, Min, IsDateString, IsOptional, IsString, MaxLength
} from 'class-validator';

export class CreateCashReconciliationDto {
  @IsDateString()
  reconciliationDate: string;

  @IsNumber()
  @Min(0)
  countedCashTotal: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
