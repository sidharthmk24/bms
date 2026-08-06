import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Science Fiction', description: 'Name of the category/genre' })
  @IsString()
  @IsNotEmpty({ message: 'Category name is required' })
  name: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', description: 'Parent category ID for sub-genres', required: false })
  @IsUUID(4, { message: 'Invalid parent category ID format' })
  @IsOptional()
  parentId?: string | null;
}

export class UpdateCategoryDto {
  @ApiProperty({ example: 'Science Fiction', description: 'Name of the category/genre', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', description: 'Parent category ID for sub-genres', required: false })
  @IsUUID(4, { message: 'Invalid parent category ID format' })
  @IsOptional()
  parentId?: string | null;
}
