
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentStatus, PaymentMode } from '../entities/bill.entity';

export class BillItemDto {
  
  @IsUUID(4)
  @IsNotEmpty()
  bookId: string;

  
  @IsInt()
  @Min(1, { message: 'Quantity must be at least 1' })
  quantity: number;
}

export class CreateBillDto {
  
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BillItemDto)
  @IsNotEmpty()
  items: BillItemDto[];

  
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  discount?: number = 0;

  
  @IsEnum(PaymentStatus)
  @IsNotEmpty()
  paymentStatus: PaymentStatus;

  
  @IsEnum(PaymentMode)
  @IsOptional()
  paymentMode?: PaymentMode;

  
  @IsUUID(4)
  @IsOptional()
  exhibitionId?: string;

  
  @IsString()
  @IsOptional()
  customerName?: string;

  
  @IsString()
  @IsOptional()
  customerPhone?: string;
}
