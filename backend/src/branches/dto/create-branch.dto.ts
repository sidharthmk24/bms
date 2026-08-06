import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';
import { BranchType } from '../entities/branch.entity';

export class CreateBranchDto {
  @ApiProperty({ example: 'BMS Koramangala', description: 'Name of the branch or store' })
  @IsString()
  @IsNotEmpty({ message: 'Branch name is required' })
  name: string;

  @ApiProperty({ example: 'BR-03', description: 'Unique short code identifier' })
  @IsString()
  @IsNotEmpty({ message: 'Branch code is required' })
  @Length(2, 20, { message: 'Branch code must be between 2 and 20 characters' })
  code: string;

  @ApiProperty({ example: 'STORE', enum: BranchType, description: 'Type of physical branch' })
  @IsEnum(BranchType, { message: 'Type must be either STORE or WAREHOUSE' })
  type: BranchType;

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
}
