import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn, Unique,
} from 'typeorm';
import { DecimalTransformer } from '../../common/transformers/decimal.transformer';
import { Branch } from '../../branches/entities/branch.entity';
import { User } from '../../users/entities/user.entity';

/**
 * CashReconciliation — daily cash drawer count vs system-recorded cash total.
 * The variance field flags discrepancies for investigation.
 */
@Entity('cash_reconciliation')
@Unique(['branchId', 'reconciliationDate'])
export class CashReconciliation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  branchId: string;

  @ManyToOne(() => Branch, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @Column({ type: 'date' })
  reconciliationDate: Date;

  /** Sum of all CASH bills on this date according to the system */
  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: DecimalTransformer })
  systemCashTotal: number;

  /** Actual cash counted in the drawer */
  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: DecimalTransformer })
  countedCashTotal: number;

  /** countedCashTotal - systemCashTotal; positive = overage, negative = shortage */
  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: DecimalTransformer })
  variance: number;

  @Column({ type: 'varchar', nullable: true })
  note: string | null;

  @Column({ type: 'varchar', length: 36 })
  reconciledById: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'reconciled_by_id' })
  reconciledBy: User;

  @CreateDateColumn()
  createdAt: Date;
}
