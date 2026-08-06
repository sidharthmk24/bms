import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { BranchType } from '../entities/branch.entity';

export class UpdateBranchDto {
  @ApiProperty({ example: 'BMS Koramangala Update', description: 'Name of the branch or store', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'BR-03', description: 'Unique short code identifier', required: false })
  @IsString()
  @IsOptional()
  @Length(2, 20, { message: 'Branch code must be between 2 and 20 characters' })
  code?: string;

  @ApiProperty({ example: 'STORE', enum: BranchType, description: 'Type of physical branch', required: false })
  @IsEnum(BranchType, { message: 'Type must be either STORE or WAREHOUSE' })
  @IsOptional()
  type?: BranchType;

  @ApiProperty({ example: '22 80 Feet Rd, Koramangala', description: 'Address of the branch', required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ example: 'Bengaluru', description: 'City where branch is located', required: false })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({ example: '9900004444', description: 'Phone number of the branch', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: true, description: 'Is the branch active', required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
