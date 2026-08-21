import {
  IsArray, ValidateNested, IsUUID, IsNotEmpty, IsNumber, Min, IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CloseExhibitionItemDto {
  @IsUUID()
  @IsNotEmpty()
  stockId: string;

  @IsNumber()
  @Min(0)
  quantitySold: number;

  @IsNumber()
  @Min(0)
  quantityReturned: number;

  @IsNumber()
  @Min(0)
  quantityDamaged: number;

  @IsNumber()
  @Min(0)
  quantityLost: number;

  @IsNumber()
  @Min(0)
  quantityCredit: number;
}

export class CloseExhibitionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CloseExhibitionItemDto)
  items: CloseExhibitionItemDto[];

  @IsOptional()
  note?: string;
}
