import { ApiProperty } from '@nestjs/swagger';
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
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', description: 'Book ID' })
  @IsUUID(4)
  @IsNotEmpty()
  bookId: string;

  @ApiProperty({ example: 2, description: 'Quantity purchased' })
  @IsInt()
  @Min(1, { message: 'Quantity must be at least 1' })
  quantity: number;
}

export class CreateBillDto {
  @ApiProperty({ type: [BillItemDto], description: 'List of items in the checkout' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BillItemDto)
  @IsNotEmpty()
  items: BillItemDto[];

  @ApiProperty({ example: 10.00, description: 'Discount applied to the bill', default: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  discount?: number = 0;

  @ApiProperty({ enum: PaymentStatus, example: PaymentStatus.PAID })
  @IsEnum(PaymentStatus)
  @IsNotEmpty()
  paymentStatus: PaymentStatus;

  @ApiProperty({ enum: PaymentMode, example: PaymentMode.CASH, required: false })
  @IsEnum(PaymentMode)
  @IsOptional()
  paymentMode?: PaymentMode;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', description: 'Associated exhibition ID if checkout is at an exhibition event', required: false })
  @IsUUID(4)
  @IsOptional()
  exhibitionId?: string;

  @ApiProperty({ example: 'John Doe', description: 'Customer Name', required: false })
  @IsString()
  @IsOptional()
  customerName?: string;

  @ApiProperty({ example: '9900112233', description: 'Customer Phone number', required: false })
  @IsString()
  @IsOptional()
  customerPhone?: string;
}
