import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, IsUUID, IsEnum, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { StockMovementType } from '../entities/stock-movement.entity';

export class GetMovementsQueryDto {
  @ApiProperty({ description: 'Filter by Book ID', required: false })
  @IsUUID(4)
  @IsOptional()
  bookId?: string;

  @ApiProperty({ description: 'Filter by Branch ID (omit for central movements)', required: false })
  @IsUUID(4)
  @IsOptional()
  branchId?: string;

  @ApiProperty({ enum: StockMovementType, description: 'Filter by movement type', required: false })
  @IsEnum(StockMovementType)
  @IsOptional()
  type?: StockMovementType;

  @ApiProperty({ description: 'Start date range (ISO String)', required: false })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ description: 'End date range (ISO String)', required: false })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({ description: 'Page number', required: false, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiProperty({ description: 'Items per page', required: false, default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 20;
}
