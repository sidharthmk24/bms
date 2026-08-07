
import { IsBoolean, IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { BranchType } from '../entities/branch.entity';

export class UpdateBranchDto {
  
  @IsString()
  @IsOptional()
  name?: string;

  
  @IsString()
  @IsOptional()
  @Length(2, 20, { message: 'Branch code must be between 2 and 20 characters' })
  code?: string;

  
  @IsEnum(BranchType, { message: 'Type must be either STORE or WAREHOUSE' })
  @IsOptional()
  type?: BranchType;

  
  @IsString()
  @IsOptional()
  address?: string;

  
  @IsString()
  @IsOptional()
  city?: string;

  
  @IsString()
  @IsOptional()
  phone?: string;

  
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
