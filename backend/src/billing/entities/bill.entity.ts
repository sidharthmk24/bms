import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index, OneToMany,
} from 'typeorm';
import { DecimalTransformer } from '../../common/transformers/decimal.transformer';
import { Branch } from '../../branches/entities/branch.entity';
import { User } from '../../users/entities/user.entity';
import { BillItem } from './bill-item.entity';

export enum PaymentStatus {
  PAID = 'PAID',
  UNPAID = 'UNPAID',
}

export enum PaymentMode {
  CASH = 'CASH',
  UPI = 'UPI',
}

export enum BillStatus {
  COMPLETED = 'COMPLETED',
  VOIDED = 'VOIDED',
}

/**
 * Bill — a completed sale at a branch counter.
 *
 * billNumber format: {BRANCH_CODE}-{YYYYMMDD}-{SEQUENCE}  e.g. BR01-20260803-0007
 *
 * exhibitionId: set when the bill was created during an exhibition, not at the
 * permanent branch counter. Allows per-exhibition sales reporting.
 *
 * NEVER delete a voided bill — mark status = VOIDED. The financial record must survive.
 */
@Entity('bill')
@Index(['createdAt'])
@Index(['branchId', 'createdAt'])
export class Bill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 50 })
  billNumber: string;

  @Column({ name: 'branch_id', type: 'varchar', length: 36 })
  branchId: string;

  @ManyToOne(() => Branch, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  /** Set if this bill was created during a travelling exhibition */
  @Column({ name: 'exhibition_id', type: 'varchar', length: 36, nullable: true })
  exhibitionId: string | null;

  @Column({ name: 'created_by_id', type: 'varchar', length: 36 })
  createdById: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: DecimalTransformer })
  subTotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, transformer: DecimalTransformer })
  discount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: DecimalTransformer })
  totalAmount: number;

  /** Total Cost of Goods Sold for the entire bill */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, transformer: DecimalTransformer })
  totalCost: number;

  @Column({ type: 'enum', enum: PaymentStatus })
  paymentStatus: PaymentStatus;

  /** null when paymentStatus = UNPAID */
  @Column({ type: 'enum', enum: PaymentMode, nullable: true })
  paymentMode: PaymentMode | null;

  @Column({ type: 'enum', enum: BillStatus, default: BillStatus.COMPLETED })
  status: BillStatus;

  @Column({ name: 'voided_by_id', type: 'varchar', length: 36, nullable: true })
  voidedById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'voided_by_id' })
  voidedBy: User;

  @Column({ type: 'text', nullable: true })
  voidReason: string | null;

  @Column({ type: 'datetime', nullable: true })
  voidedAt: Date | null;

  @Column({ length: 150, nullable: true })
  customerName: string | null;

  @Column({ length: 20, nullable: true })
  customerPhone: string | null;

  @OneToMany(() => BillItem, (item) => item.bill)
  items: BillItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
