
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min, Length } from 'class-validator';

export class CreateBookDto {
  
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  title: string;

  
  @IsString()
  @IsNotEmpty({ message: 'ISBN is required' })
  isbn: string;

  
  @IsString()
  @IsOptional()
  barcode?: string;

  
  @IsString()
  @IsOptional()
  description?: string;

  
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'Price cannot be negative' })
  price: number;

  
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'Cost price cannot be negative' })
  @IsOptional()
  costPrice?: number;

  
  @IsString()
  @IsOptional()
  coverImageUrl?: string;

  
  @IsUUID(4, { message: 'Invalid Author ID format' })
  authorId: string;

  
  @IsUUID(4, { message: 'Invalid Publisher ID format' })
  publisherId: string;

  
  @IsUUID(4, { message: 'Invalid Category ID format' })
  categoryId: string;
}

export class UpdateBookDto {
  
  @IsString()
  @IsOptional()
  title?: string;

  
  @IsString()
  @IsOptional()
  isbn?: string;

  
  @IsString()
  @IsOptional()
  barcode?: string;

  
  @IsString()
  @IsOptional()
  description?: string;

  
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'Price cannot be negative' })
  @IsOptional()
  price?: number;

  
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'Cost price cannot be negative' })
  @IsOptional()
  costPrice?: number;

  
  @IsString()
  @IsOptional()
  coverImageUrl?: string;

  
  @IsUUID(4, { message: 'Invalid Author ID format' })
  @IsOptional()
  authorId?: string;

  
  @IsUUID(4, { message: 'Invalid Publisher ID format' })
  @IsOptional()
  publisherId?: string;

  
  @IsUUID(4, { message: 'Invalid Category ID format' })
  @IsOptional()
  categoryId?: string;
}
