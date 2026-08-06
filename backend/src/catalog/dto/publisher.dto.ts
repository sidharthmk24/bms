import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePublisherDto {
  @ApiProperty({ example: 'Penguin Random House', description: 'Name of the publisher' })
  @IsString()
  @IsNotEmpty({ message: 'Publisher name is required' })
  name: string;
}

export class UpdatePublisherDto {
  @ApiProperty({ example: 'Penguin Random House', description: 'Name of the publisher', required: false })
  @IsString()
  @IsOptional()
  name?: string;
}
