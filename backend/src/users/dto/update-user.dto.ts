import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEmail, IsEnum, IsOptional, IsString, IsUUID, ArrayMinSize } from 'class-validator';
import { UserRole } from '../enums/user-role.enum';

export class UpdateUserDto {
  @ApiProperty({ example: 'Siddharth R', description: 'Full name of the staff member', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'siddharth@bms.com', description: 'Unique staff email address', required: false })
  @IsEmail({}, { message: 'Please enter a valid email address' })
  @IsOptional()
  email?: string;

  @ApiProperty({ example: ['BRANCH_FRONT_OFFICE'], enum: [UserRole], description: 'Roles assigned to the staff', required: false })
  @IsArray()
  @IsEnum(UserRole, { each: true, message: 'Invalid role assigned' })
  @ArrayMinSize(1, { message: 'At least one role must be assigned' })
  @IsOptional()
  roles?: UserRole[];

  @ApiProperty({ example: 'BRANCH_FRONT_OFFICE', enum: UserRole, description: 'Primary role for the staff', required: false })
  @IsEnum(UserRole, { message: 'Invalid primary role assigned' })
  @IsOptional()
  primaryRole?: UserRole;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', description: 'Branch ID', required: false })
  @IsUUID(4, { message: 'Invalid Branch ID format' })
  @IsOptional()
  branchId?: string | null;
}
