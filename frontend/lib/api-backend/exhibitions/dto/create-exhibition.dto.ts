import {
  IsString, IsNotEmpty, IsUUID, IsDateString,
  IsArray, ValidateNested, IsNumber, Min, IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ExhibitionStockItemDto {
  @IsUUID()
  @IsNotEmpty()
  bookId: string;

  @IsNumber()
  @Min(1)
  quantityTaken: number;

  @IsNumber()
  @IsOptional()
  quantityFromBranch?: number;

  @IsNumber()
  @IsOptional()
  quantityFromCentral?: number;
}

export class CreateExhibitionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  location: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExhibitionStockItemDto)
  items: ExhibitionStockItemDto[];

  @IsString()
  @IsOptional()
  assignedUserId?: string;

  @IsString()
  @IsOptional()
  sourceBranchId?: string;
}
