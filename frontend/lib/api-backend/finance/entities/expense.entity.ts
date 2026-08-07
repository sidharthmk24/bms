import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { DecimalTransformer } from '../../common/transformers/decimal.transformer';
import { Branch } from '../../branches/entities/branch.entity';
import { User } from '../../users/entities/user.entity';

export enum ExpenseCategory {
  RENT = 'RENT',
  SALARY = 'SALARY',
  UTILITIES = 'UTILITIES',
  SUPPLIES = 'SUPPLIES',
  MAINTENANCE = 'MAINTENANCE',
  MARKETING = 'MARKETING',
  PROCUREMENT = 'PROCUREMENT',
  OTHER = 'OTHER',
}

/**
 * Expense — manually entered costs by Finance staff.
 *
 * branchId = null → chain-wide expense (e.g. central marketing campaign).
 * branchId set → expense for that specific branch.
 *
 * Edits write an ExpenseRevision row so the original amount is never lost.
 */
@Entity('expense')
export class Expense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  branchId: string | null;

  @ManyToOne(() => Branch, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @Column({ type: 'enum', enum: ExpenseCategory })
  category: ExpenseCategory;

  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: DecimalTransformer })
  amount: number;

  @Column({ type: 'varchar' })
  description: string;

  @Column({ type: 'date' })
  expenseDate: Date;

  @Column({ type: 'varchar', length: 36 })
  enteredById: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'entered_by_id' })
  enteredBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
