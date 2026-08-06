import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateBranchInventoryDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', description: 'Book ID' })
  @IsUUID(4, { message: 'Invalid Book ID format' })
  @IsNotEmpty()
  bookId: string;

  @ApiProperty({ example: 10, description: 'Opening stock quantity', default: 0 })
  @IsInt()
  @Min(0, { message: 'Opening quantity must be a non-negative integer' })
  @IsOptional()
  quantity?: number = 0;

  @ApiProperty({ example: 5, description: 'Low stock reorder threshold', default: 5 })
  @IsInt()
  @Min(0, { message: 'Threshold must be a non-negative integer' })
  @IsOptional()
  threshold?: number = 5;
}
