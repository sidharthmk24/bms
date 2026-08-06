import { ApiProperty } from '@nestjs/swagger';
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
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', description: 'Book ID' })
  @IsUUID(4)
  @IsNotEmpty()
  bookId: string;

  @ApiProperty({ example: 10, description: 'Quantity approved' })
  @IsInt()
  @Min(0, { message: 'Approved quantity must be a non-negative integer' })
  quantityApproved: number;
}

export class ReviewRestockRequestDto {
  @ApiProperty({ enum: ReviewStatus, example: ReviewStatus.APPROVED })
  @IsEnum(ReviewStatus, { message: 'Review status must be either APPROVED or REJECTED' })
  @IsNotEmpty()
  status: ReviewStatus;

  @ApiProperty({ type: [ReviewRestockItemDto], description: 'List of approved quantities per item', required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReviewRestockItemDto)
  @IsOptional()
  items?: ReviewRestockItemDto[];

  @ApiProperty({ example: 'Approved and allocated stock', description: 'Review note', required: false })
  @IsString()
  @IsOptional()
  note?: string;
}
