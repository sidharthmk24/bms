import { IsArray, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { StockSourceType } from '../entities/exhibition-stock-source.entity';

export class StockRequestItemDto {
  @IsUUID(4)
  @IsNotEmpty()
  bookId: string;

  @IsInt()
  @Min(1)
  quantityRequested: number;
}

export class CreateStockRequestDto {
  @IsEnum(StockSourceType)
  @IsNotEmpty()
  sourceType: StockSourceType;

  @IsUUID(4)
  @IsOptional()
  sourceBranchId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StockRequestItemDto)
  @IsNotEmpty()
  items: StockRequestItemDto[];
}
