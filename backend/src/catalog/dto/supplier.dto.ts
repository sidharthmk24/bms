import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSupplierDto {
  @ApiProperty({ example: 'Books & Beyond Distributors', description: 'Name of the supplier' })
  @IsString()
  @IsNotEmpty({ message: 'Supplier name is required' })
  name: string;

  @ApiProperty({ example: 'Mohan Lal', description: 'Contact person name', required: false })
  @IsString()
  @IsOptional()
  contactPerson?: string;

  @ApiProperty({ example: '9810001111', description: 'Phone number of the supplier', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'mohan@bbd.com', description: 'Email address of the supplier', required: false })
  @IsEmail({}, { message: 'Invalid supplier email format' })
  @IsOptional()
  email?: string;

  @ApiProperty({ example: 'Nehru Place, Delhi', description: 'Physical address of the supplier', required: false })
  @IsString()
  @IsOptional()
  address?: string;
}

export class UpdateSupplierDto {
  @ApiProperty({ example: 'Books & Beyond Distributors', description: 'Name of the supplier', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'Mohan Lal', description: 'Contact person name', required: false })
  @IsString()
  @IsOptional()
  contactPerson?: string;

  @ApiProperty({ example: '9810001111', description: 'Phone number of the supplier', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'mohan@bbd.com', description: 'Email address of the supplier', required: false })
  @IsEmail({}, { message: 'Invalid supplier email format' })
  @IsOptional()
  email?: string;

  @ApiProperty({ example: 'Nehru Place, Delhi', description: 'Physical address of the supplier', required: false })
  @IsString()
  @IsOptional()
  address?: string;
}
