import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Book } from '../../catalog/entities/book.entity';
import { Branch } from '../../branches/entities/branch.entity';
import { User } from '../../users/entities/user.entity';

export enum StockMovementType {
  SALE = 'SALE',
  SALE_VOID = 'SALE_VOID',
  RESTOCK_IN = 'RESTOCK_IN',
  TRANSFER_OUT = 'TRANSFER_OUT',
  TRANSFER_IN = 'TRANSFER_IN',
  EXHIBITION_OUT = 'EXHIBITION_OUT',
  EXHIBITION_RETURN = 'EXHIBITION_RETURN',
  PURCHASE_RECEIPT = 'PURCHASE_RECEIPT',
  ADJUSTMENT = 'ADJUSTMENT',
}

export enum AdjustmentReason {
  DAMAGED = 'DAMAGED',
  LOST = 'LOST',
  SAMPLE = 'SAMPLE',
  RETURNED_TO_SUPPLIER = 'RETURNED_TO_SUPPLIER',
  CORRECTION = 'CORRECTION',
}

export enum MovementReferenceType {
  BILL = 'BILL',
  RESTOCK_REQUEST = 'RESTOCK_REQUEST',
  EXHIBITION = 'EXHIBITION',
  PURCHASE_ORDER = 'PURCHASE_ORDER',
  MANUAL = 'MANUAL',
}

/**
 * StockMovement — the permanent, append-only stock ledger.
 *
 * NEVER update or delete these rows. They are the audit trail.
 * Every stock change (sale, restock, adjustment, exhibition) MUST write
 * a movement row in the SAME transaction as the quantity update.
 *
 * quantity is SIGNED: negative = stock leaving, positive = stock arriving.
 * branchId = null means the movement is on the central warehouse pool.
 */
@Entity('stock_movement')
@Index(['bookId', 'createdAt'])
@Index(['branchId', 'createdAt'])
@Index(['referenceType', 'referenceId'])
export class StockMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'book_id', type: 'varchar', length: 36 })
  bookId: string;

  @ManyToOne(() => Book, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'book_id' })
  book: Book;

  /** null = central warehouse pool movement */
  @Column({ type: 'varchar', name: 'branch_id', type: 'varchar', length: 36, nullable: true })
  branchId: string | null;

  @ManyToOne(() => Branch, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @Column({ type: 'enum', enum: StockMovementType })
  type: StockMovementType;

  /** Only populated for ADJUSTMENT type movements */
  @Column({ type: 'enum', enum: AdjustmentReason, nullable: true })
  reason: AdjustmentReason | null;

  /** Signed integer: negative = out, positive = in */
  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'enum', enum: MovementReferenceType, nullable: true })
  referenceType: MovementReferenceType | null;

  @Column({ type: 'varchar', type: 'varchar', length: 36, nullable: true })
  referenceId: string | null;

  @Column({ type: 'varchar', name: 'performed_by_id', type: 'varchar', length: 36 })
  performedById: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'performed_by_id' })
  performedBy: User;

  @Column({ type: 'varchar', type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
