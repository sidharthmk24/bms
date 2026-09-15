
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class RestockRequestItemDto {
  @IsUUID(4)
  @IsNotEmpty()
  bookId: string;

  @IsInt()
  @Min(1, { message: 'Requested quantity must be at least 1' })
  quantity: number;
}

export class CreateRestockRequestDto {
  @IsOptional()
  @IsUUID(4)
  branchId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RestockRequestItemDto)
  @IsNotEmpty()
  items: RestockRequestItemDto[];
}
