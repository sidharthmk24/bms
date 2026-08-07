
import { IsOptional, IsString, IsInt, Min, IsUUID, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class GetBillsQueryDto {
  
  @IsString()
  @IsOptional()
  search?: string;


  @IsUUID(4)
  @IsOptional()
  branchId?: string;


  @IsDateString()
  @IsOptional()
  startDate?: string;


  @IsDateString()
  @IsOptional()
  endDate?: string;

  
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 15;
}
