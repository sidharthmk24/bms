import { IsArray, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ReviewStockRequestItemDto {
  @IsUUID(4)
  @IsNotEmpty()
  bookId: string;

  @IsInt()
  @Min(0)
  quantityApproved: number;
}

export enum ReviewAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export class ReviewStockRequestDto {
  @IsEnum(ReviewAction)
  @IsNotEmpty()
  action: ReviewAction;

  @IsString()
  @IsOptional()
  reviewNote?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReviewStockRequestItemDto)
  @IsOptional()
  items?: ReviewStockRequestItemDto[];
}
