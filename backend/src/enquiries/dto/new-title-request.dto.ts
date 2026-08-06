import {
  IsString, IsNotEmpty, IsOptional, IsEnum,
  MaxLength,
} from 'class-validator';
import { NewTitleRequestStatus } from '../entities/new-title-request.entity';

export class CreateNewTitleRequestDto {
  @IsString()
  @IsNotEmpty()
  freeTextTitle: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  author?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  isbn?: string;
}

export class ReviewNewTitleRequestDto {
  @IsEnum(NewTitleRequestStatus)
  status: NewTitleRequestStatus;

  /** Optional: if approved and book was added to catalog, link it */
  @IsOptional()
  @IsString()
  createdBookId?: string;
}
