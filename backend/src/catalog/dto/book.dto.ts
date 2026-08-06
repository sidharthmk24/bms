import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min, Length } from 'class-validator';

export class CreateBookDto {
  @ApiProperty({ example: 'Harry Potter and the Philosopher\'s Stone', description: 'Title of the book' })
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  title: string;

  @ApiProperty({ example: '978-0747532699', description: 'ISBN unique code' })
  @IsString()
  @IsNotEmpty({ message: 'ISBN is required' })
  isbn: string;

  @ApiProperty({ example: '978-0747532699', description: 'Unique barcode (defaults to ISBN if not provided)', required: false })
  @IsString()
  @IsOptional()
  barcode?: string;

  @ApiProperty({ example: 'The story of a young wizard...', description: 'Book summary/description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 350.00, description: 'Selling price of the book' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'Price cannot be negative' })
  price: number;

  @ApiProperty({ example: 195.00, description: 'Cost price of the book (for margin calculations)', required: false })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'Cost price cannot be negative' })
  @IsOptional()
  costPrice?: number;

  @ApiProperty({ example: 'http://example.com/cover.jpg', description: 'Cover image URL', required: false })
  @IsString()
  @IsOptional()
  coverImageUrl?: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', description: 'Author UUID ID' })
  @IsUUID(4, { message: 'Invalid Author ID format' })
  authorId: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', description: 'Publisher UUID ID' })
  @IsUUID(4, { message: 'Invalid Publisher ID format' })
  publisherId: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', description: 'Category UUID ID' })
  @IsUUID(4, { message: 'Invalid Category ID format' })
  categoryId: string;
}

export class UpdateBookDto {
  @ApiProperty({ example: 'Harry Potter and the Philosopher\'s Stone', description: 'Title of the book', required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ example: '978-0747532699', description: 'ISBN unique code', required: false })
  @IsString()
  @IsOptional()
  isbn?: string;

  @ApiProperty({ example: '978-0747532699', description: 'Unique barcode', required: false })
  @IsString()
  @IsOptional()
  barcode?: string;

  @ApiProperty({ example: 'The story of a young wizard...', description: 'Book summary/description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 350.00, description: 'Selling price of the book', required: false })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'Price cannot be negative' })
  @IsOptional()
  price?: number;

  @ApiProperty({ example: 195.00, description: 'Cost price of the book', required: false })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'Cost price cannot be negative' })
  @IsOptional()
  costPrice?: number;

  @ApiProperty({ example: 'http://example.com/cover.jpg', description: 'Cover image URL', required: false })
  @IsString()
  @IsOptional()
  coverImageUrl?: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', description: 'Author UUID ID', required: false })
  @IsUUID(4, { message: 'Invalid Author ID format' })
  @IsOptional()
  authorId?: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', description: 'Publisher UUID ID', required: false })
  @IsUUID(4, { message: 'Invalid Publisher ID format' })
  @IsOptional()
  publisherId?: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', description: 'Category UUID ID', required: false })
  @IsUUID(4, { message: 'Invalid Category ID format' })
  @IsOptional()
  categoryId?: string;
}
