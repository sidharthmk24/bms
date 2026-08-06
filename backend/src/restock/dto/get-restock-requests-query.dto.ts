import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsInt, Min, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { RestockRequestStatus } from '../entities/restock-request.entity';

export class GetRestockRequestsQueryDto {
  @ApiProperty({ description: 'Filter by Branch ID (chain managers only)', required: false })
  @IsUUID(4)
  @IsOptional()
  branchId?: string;

  @ApiProperty({ enum: RestockRequestStatus, description: 'Filter by request status', required: false })
  @IsEnum(RestockRequestStatus)
  @IsOptional()
  status?: RestockRequestStatus;

  @ApiProperty({ description: 'Page number', required: false, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiProperty({ description: 'Items per page', required: false, default: 15 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 15;
}
