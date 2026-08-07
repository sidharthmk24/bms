
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ReviewStatus {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export class ReviewRestockItemDto {
  
  @IsUUID(4)
  @IsNotEmpty()
  bookId: string;

  
  @IsInt()
  @Min(0, { message: 'Approved quantity must be a non-negative integer' })
  quantityApproved: number;
}

export class ReviewRestockRequestDto {
  
  @IsEnum(ReviewStatus, { message: 'Review status must be either APPROVED or REJECTED' })
  @IsNotEmpty()
  status: ReviewStatus;

  
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReviewRestockItemDto)
  @IsOptional()
  items?: ReviewRestockItemDto[];

  
  @IsString()
  @IsOptional()
  note?: string;
}
