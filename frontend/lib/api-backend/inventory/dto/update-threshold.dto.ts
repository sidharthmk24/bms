
import { IsInt, Min } from 'class-validator';

export class UpdateThresholdDto {
  
  @IsInt()
  @Min(0, { message: 'Threshold must be a non-negative integer' })
  threshold: number;
}
