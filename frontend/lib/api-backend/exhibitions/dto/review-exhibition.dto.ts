import { IsString, IsOptional, MaxLength } from 'class-validator';

export class ReviewExhibitionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
