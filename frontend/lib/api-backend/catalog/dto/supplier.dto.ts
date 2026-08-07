
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSupplierDto {
  
  @IsString()
  @IsNotEmpty({ message: 'Supplier name is required' })
  name: string;

  
  @IsString()
  @IsOptional()
  contactPerson?: string;

  
  @IsString()
  @IsOptional()
  phone?: string;

  
  @IsEmail({}, { message: 'Invalid supplier email format' })
  @IsOptional()
  email?: string;

  
  @IsString()
  @IsOptional()
  address?: string;
}

export class UpdateSupplierDto {
  
  @IsString()
  @IsOptional()
  name?: string;

  
  @IsString()
  @IsOptional()
  contactPerson?: string;

  
  @IsString()
  @IsOptional()
  phone?: string;

  
  @IsEmail({}, { message: 'Invalid supplier email format' })
  @IsOptional()
  email?: string;

  
  @IsString()
  @IsOptional()
  address?: string;
}
