
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class VoidBillDto {
  
  @IsString()
  @IsNotEmpty({ message: 'Void reason is required' })
  @MinLength(5, { message: 'Reason must be at least 5 characters long' })
  reason: string;
}
