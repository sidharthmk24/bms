
import { IsEnum, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';
import { BranchType } from '../entities/branch.entity';

export class CreateBranchDto {
  
  @IsString()
  @IsNotEmpty({ message: 'Branch name is required' })
  name: string;

  
  @IsString()
  @IsNotEmpty({ message: 'Branch code is required' })
  @Length(2, 20, { message: 'Branch code must be between 2 and 20 characters' })
  code: string;

  
  @IsEnum(BranchType, { message: 'Type must be either STORE or WAREHOUSE' })
  type: BranchType;

  
  @IsString()
  @IsOptional()
  address?: string;

  
  @IsString()
  @IsOptional()
  city?: string;

  
  @IsString()
  @IsOptional()
  phone?: string;
}
