
import { IsOptional, IsEnum, IsInt, Min, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { RestockRequestStatus } from '../entities/restock-request.entity';

export class GetRestockRequestsQueryDto {
  
  @IsUUID(4)
  @IsOptional()
  branchId?: string;

  
  @IsEnum(RestockRequestStatus)
  @IsOptional()
  status?: RestockRequestStatus;

  
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
