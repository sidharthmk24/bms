
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCategoryDto {
  
  @IsString()
  @IsNotEmpty({ message: 'Category name is required' })
  name: string;

  
  @IsUUID(4, { message: 'Invalid parent category ID format' })
  @IsOptional()
  parentId?: string | null;
}

export class UpdateCategoryDto {
  
  @IsString()
  @IsOptional()
  name?: string;

  
  @IsUUID(4, { message: 'Invalid parent category ID format' })
  @IsOptional()
  parentId?: string | null;
}
