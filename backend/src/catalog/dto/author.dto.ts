import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAuthorDto {
  @ApiProperty({ example: 'J.K. Rowling', description: 'Name of the author' })
  @IsString()
  @IsNotEmpty({ message: 'Author name is required' })
  name: string;

  @ApiProperty({ example: 'British author, best known for Harry Potter.', description: 'Brief bio', required: false })
  @IsString()
  @IsOptional()
  bio?: string;
}

export class UpdateAuthorDto {
  @ApiProperty({ example: 'J.K. Rowling', description: 'Name of the author', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'British author, best known for Harry Potter.', description: 'Brief bio', required: false })
  @IsString()
  @IsOptional()
  bio?: string;
}
