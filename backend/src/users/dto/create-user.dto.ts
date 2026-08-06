import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, ArrayMinSize } from 'class-validator';
import { UserRole } from '../enums/user-role.enum';

export class CreateUserDto {
  @ApiProperty({ example: 'Siddharth R', description: 'Full name of the staff member' })
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  name: string;

  @ApiProperty({ example: 'siddharth@bms.com', description: 'Unique staff email address (used for login)' })
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email: string;

  @ApiProperty({ example: ['BRANCH_FRONT_OFFICE'], enum: [UserRole], description: 'Roles assigned to the staff' })
  @IsArray()
  @IsEnum(UserRole, { each: true, message: 'Invalid role assigned' })
  @ArrayMinSize(1, { message: 'At least one role must be assigned' })
  roles: UserRole[];

  @ApiProperty({ example: 'BRANCH_FRONT_OFFICE', enum: UserRole, description: 'Primary role for the staff' })
  @IsEnum(UserRole, { message: 'Invalid primary role assigned' })
  @IsNotEmpty({ message: 'Primary role is required' })
  primaryRole: UserRole;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', description: 'Branch ID (required for branch-scoped roles)', required: false })
  @IsUUID(4, { message: 'Invalid Branch ID format' })
  @IsOptional()
  branchId?: string | null;
}
