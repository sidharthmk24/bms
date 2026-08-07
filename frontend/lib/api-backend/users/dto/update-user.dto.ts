
import { IsArray, IsEmail, IsEnum, IsOptional, IsString, IsUUID, ArrayMinSize } from 'class-validator';
import { UserRole } from '../enums/user-role.enum';

export class UpdateUserDto {
  
  @IsString()
  @IsOptional()
  name?: string;

  
  @IsEmail({}, { message: 'Please enter a valid email address' })
  @IsOptional()
  email?: string;

  
  @IsArray()
  @IsEnum(UserRole, { each: true, message: 'Invalid role assigned' })
  @ArrayMinSize(1, { message: 'At least one role must be assigned' })
  @IsOptional()
  roles?: UserRole[];

  
  @IsEnum(UserRole, { message: 'Invalid primary role assigned' })
  @IsOptional()
  primaryRole?: UserRole;

  
  @IsUUID(4, { message: 'Invalid Branch ID format' })
  @IsOptional()
  branchId?: string | null;
}
