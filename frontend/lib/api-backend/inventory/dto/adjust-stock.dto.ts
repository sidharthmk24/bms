
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { AdjustmentReason } from '../entities/stock-movement.entity';

export class AdjustStockDto {
  
  @IsInt()
  quantity: number;

  
  @IsEnum(AdjustmentReason, { message: 'Invalid adjustment reason' })
  @IsNotEmpty()
  reason: AdjustmentReason;

  
  @IsString()
  @IsOptional()
  note?: string;
}
