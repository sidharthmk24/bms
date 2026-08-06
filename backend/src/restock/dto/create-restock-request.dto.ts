import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsNotEmpty, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class RestockRequestItemDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', description: 'Book ID' })
  @IsUUID(4)
  @IsNotEmpty()
  bookId: string;

  @ApiProperty({ example: 10, description: 'Quantity requested' })
  @IsInt()
  @Min(1, { message: 'Requested quantity must be at least 1' })
  quantity: number;
}

export class CreateRestockRequestDto {
  @ApiProperty({ type: [RestockRequestItemDto], description: 'List of books and quantities requested' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RestockRequestItemDto)
  @IsNotEmpty()
  items: RestockRequestItemDto[];
}
