import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { DecimalTransformer } from '../../common/transformers/decimal.transformer';
import { Expense } from './expense.entity';
import { User } from '../../users/entities/user.entity';

/**
 * ExpenseRevision — immutable record of every edit to an expense.
 * Stores the PREVIOUS values so auditors can reconstruct history.
 * Never update or delete these rows.
 */
@Entity('expense_revision')
export class ExpenseRevision {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'expense_id', type: 'varchar', length: 36 })
  expenseId: string;

  @ManyToOne(() => Expense, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'expense_id' })
  expense: Expense;

  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: DecimalTransformer })
  previousAmount: number;

  @Column({ type: 'text' })
  previousDescription: string;

  @Column({ type: 'varchar', length: 36 })
  changedById: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'changed_by_id' })
  changedBy: User;

  @CreateDateColumn()
  changedAt: Date;
}
