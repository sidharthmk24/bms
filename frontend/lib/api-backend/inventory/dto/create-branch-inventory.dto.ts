
import { IsInt, IsNotEmpty, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateBranchInventoryDto {
  
  @IsUUID(4, { message: 'Invalid Book ID format' })
  @IsNotEmpty()
  bookId: string;

  
  @IsInt()
  @Min(0, { message: 'Opening quantity must be a non-negative integer' })
  @IsOptional()
  quantity?: number = 0;

  
  @IsInt()
  @Min(0, { message: 'Threshold must be a non-negative integer' })
  @IsOptional()
  threshold?: number = 5;
}
