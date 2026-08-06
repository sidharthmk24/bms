import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { AdjustmentReason } from '../entities/stock-movement.entity';

export class AdjustStockDto {
  @ApiProperty({
    example: -2,
    description: 'Signed inventory quantity adjustment value. Use negative for stock leaving, positive for corrections.',
  })
  @IsInt()
  quantity: number;

  @ApiProperty({
    enum: AdjustmentReason,
    example: AdjustmentReason.DAMAGED,
    description: 'Reason for the inventory adjustment',
  })
  @IsEnum(AdjustmentReason, { message: 'Invalid adjustment reason' })
  @IsNotEmpty()
  reason: AdjustmentReason;

  @ApiProperty({ example: 'Lost 2 copies during store cleanup', description: 'Additional context notes', required: false })
  @IsString()
  @IsOptional()
  note?: string;
}
