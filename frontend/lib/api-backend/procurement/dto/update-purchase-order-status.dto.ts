import { IsEnum, IsNotEmpty, IsOptional, ValidateNested, IsArray, IsNumber, Min, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { PurchaseOrderStatus } from '../entities/purchase-order.entity';

export class ReceivePurchaseOrderItemDto {
  @IsUUID()
  @IsNotEmpty()
  itemId: string;

  @IsNumber()
  @Min(0)
  quantityReceived: number;
}

export class UpdatePurchaseOrderStatusDto {
  @IsEnum(PurchaseOrderStatus)
  @IsNotEmpty()
  status: PurchaseOrderStatus;

  /** Required when status is RECEIVED or PARTIALLY_RECEIVED */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceivePurchaseOrderItemDto)
  items?: ReceivePurchaseOrderItemDto[];
}
