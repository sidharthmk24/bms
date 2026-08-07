
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAuthorDto {
  
  @IsString()
  @IsNotEmpty({ message: 'Author name is required' })
  name: string;

  
  @IsString()
  @IsOptional()
  bio?: string;
}

export class UpdateAuthorDto {
  
  @IsString()
  @IsOptional()
  name?: string;

  
  @IsString()
  @IsOptional()
  bio?: string;
}
