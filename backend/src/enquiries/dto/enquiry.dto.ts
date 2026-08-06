import {
  IsUUID, IsOptional, IsString, IsEnum,
  MaxLength, ValidateIf,
} from 'class-validator';
import { EnquiryStatus } from '../entities/book-enquiry.entity';

export class CreateEnquiryDto {
  /** Set when book IS in catalog (out of stock) */
  @IsOptional()
  @IsUUID()
  bookId?: string;

  /** Set when book is NOT in catalog at all */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  freeTextTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  customerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  customerPhone?: string;
}

export class UpdateEnquiryStatusDto {
  @IsEnum(EnquiryStatus)
  status: EnquiryStatus;
}
