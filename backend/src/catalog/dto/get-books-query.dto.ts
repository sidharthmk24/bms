import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class GetBooksQueryDto {
  @ApiProperty({ description: 'Search term for title, isbn, or barcode', required: false })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({ description: 'Filter by category ID', required: false })
  @IsUUID(4)
  @IsOptional()
  categoryId?: string;

  @ApiProperty({ description: 'Filter by author ID', required: false })
  @IsUUID(4)
  @IsOptional()
  authorId?: string;

  @ApiProperty({ description: 'Filter by publisher ID', required: false })
  @IsUUID(4)
  @IsOptional()
  publisherId?: string;

  @ApiProperty({ description: 'Page number (starts at 1)', required: false, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiProperty({ description: 'Items per page', required: false, default: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 10;

  @ApiProperty({ description: 'Field to sort by', required: false, default: 'title' })
  @IsString()
  @IsOptional()
  sortBy?: string = 'title';

  @ApiProperty({ description: 'Sort order', required: false, enum: ['ASC', 'DESC'], default: 'ASC' })
  @IsString()
  @IsOptional()
  order?: 'ASC' | 'DESC' = 'ASC';
}
