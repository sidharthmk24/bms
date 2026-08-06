import {
  IsString, IsNotEmpty, IsEnum, IsNumber,
  Min, IsDateString, IsOptional, IsUUID,
  MaxLength
} from 'class-validator';
import { ExpenseCategory } from '../entities/expense.entity';

export class CreateExpenseDto {
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsEnum(ExpenseCategory)
  category: ExpenseCategory;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  description: string;

  @IsDateString()
  expenseDate: string;
}

export class UpdateExpenseDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  description: string;
}
