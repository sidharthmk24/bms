import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class UpdateThresholdDto {
  @ApiProperty({ example: 10, description: 'Reorder alert threshold limit' })
  @IsInt()
  @Min(0, { message: 'Threshold must be a non-negative integer' })
  threshold: number;
}
