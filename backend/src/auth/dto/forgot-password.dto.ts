import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'superadmin@bms.com', description: 'Registered email address to send the reset link' })
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email: string;
}
