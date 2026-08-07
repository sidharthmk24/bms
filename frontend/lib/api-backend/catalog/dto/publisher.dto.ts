
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePublisherDto {
  
  @IsString()
  @IsNotEmpty({ message: 'Publisher name is required' })
  name: string;
}

export class UpdatePublisherDto {
  
  @IsString()
  @IsOptional()
  name?: string;
}
