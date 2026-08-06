import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'superadmin@bms.com', description: 'Staff email address' })
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email: string;

  @ApiProperty({ example: 'Password@123', description: 'Staff account password' })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
