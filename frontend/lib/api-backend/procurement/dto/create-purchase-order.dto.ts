import {
  IsUUID, IsNotEmpty, IsOptional, IsArray,
  ValidateNested, IsNumber, Min, IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class NewBookInlineDto {
  @IsNotEmpty()
  title: string;

  @IsNotEmpty()
  isbn: string;

  @IsOptional()
  barcode?: string;

  @IsOptional()
  authorName?: string;

  @IsOptional()
  categoryName?: string;

  @IsOptional()
  publisherName?: string;

  @IsOptional()
  @IsNumber()
  price?: number;
}

export class PurchaseOrderItemDto {
  @IsOptional()
  bookId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => NewBookInlineDto)
  newBook?: NewBookInlineDto;

  @IsOptional()
  pmsTitle?: any;

  @IsNumber()
  @Min(1)
  quantityOrdered: number;

  @IsNumber()
  @Min(0)
  unitCost: number;
}

export class CreatePurchaseOrderDto {
  @IsOptional()
  supplierId?: string;

  @IsOptional()
  supplierName?: string;

  @IsOptional()
  @IsDateString()
  expectedDate?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items: PurchaseOrderItemDto[];

  @IsOptional()
  @IsUUID(4)
  poRequestId?: string;
}
