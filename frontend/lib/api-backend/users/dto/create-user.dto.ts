
import { IsArray, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, ArrayMinSize } from 'class-validator';
import { UserRole } from '../enums/user-role.enum';

export class CreateUserDto {
  
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  name: string;


  @IsEmail({}, { message: 'Please enter a valid email address' })
  email: string;

  
  @IsArray()
  @IsEnum(UserRole, { each: true, message: 'Invalid role assigned' })
  @ArrayMinSize(1, { message: 'At least one role must be assigned' })
  roles: UserRole[];

  
  @IsEnum(UserRole, { message: 'Invalid primary role assigned' })
  @IsNotEmpty({ message: 'Primary role is required' })
  primaryRole: UserRole;

  
  @IsUUID(4, { message: 'Invalid Branch ID format' })
  @IsOptional()
  branchId?: string | null;
}
