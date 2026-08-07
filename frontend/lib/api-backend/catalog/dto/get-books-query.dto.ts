
import { IsOptional, IsString, IsInt, Min, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class GetBooksQueryDto {
  
  @IsString()
  @IsOptional()
  search?: string;

  
  @IsUUID(4)
  @IsOptional()
  categoryId?: string;

  
  @IsUUID(4)
  @IsOptional()
  authorId?: string;

  
  @IsUUID(4)
  @IsOptional()
  publisherId?: string;


  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 10;

  
  @IsString()
  @IsOptional()
  sortBy?: string = 'title';

  
  @IsString()
  @IsOptional()
  order?: 'ASC' | 'DESC' = 'ASC';
}
