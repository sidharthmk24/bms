
import { IsOptional, IsString, IsInt, Min, IsUUID, IsEnum, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { StockMovementType } from '../entities/stock-movement.entity';

export class GetMovementsQueryDto {
  
  @IsUUID(4)
  @IsOptional()
  bookId?: string;

  
  @IsUUID(4)
  @IsOptional()
  branchId?: string;

  
  @IsEnum(StockMovementType)
  @IsOptional()
  type?: StockMovementType;

  
  @IsDateString()
  @IsOptional()
  startDate?: string;

  
  @IsDateString()
  @IsOptional()
  endDate?: string;

  
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 20;
}
