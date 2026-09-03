import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Book } from '../../catalog/entities/book.entity';
import { User } from '../../users/entities/user.entity';
import type { RestockRequest } from '../../restock/entities/restock-request.entity';
import type { RestockRequestItem } from '../../restock/entities/restock-request-item.entity';
import type { PurchaseOrder } from './purchase-order.entity';
import { DecimalTransformer } from '../../common/transformers/decimal.transformer';

export enum PurchaseOrderRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ORDERED = 'ORDERED',
}

@Entity('purchase_order_request')
export class PurchaseOrderRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  restockRequestId: string | null;

  @ManyToOne('RestockRequest', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'restock_request_id' })
  restockRequest: RestockRequest | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  restockRequestItemId: string | null;

  @ManyToOne('RestockRequestItem', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'restock_request_item_id' })
  restockRequestItem: RestockRequestItem | null;

  @Column({ type: 'varchar', length: 36 })
  bookId: string;

  @ManyToOne(() => Book, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'book_id' })
  book: Book;

  @Column({ type: 'int' })
  quantity: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: DecimalTransformer,
  })
  estimatedCost: number | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({
    type: 'enum',
    enum: PurchaseOrderRequestStatus,
    default: PurchaseOrderRequestStatus.PENDING,
  })
  status: PurchaseOrderRequestStatus;

  @Column({ type: 'varchar', length: 36 })
  requestedById: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'requested_by_id' })
  requestedBy: User;

  @Column({ type: 'varchar', length: 36, nullable: true })
  reviewedById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewed_by_id' })
  reviewedBy: User | null;

  @Column({ type: 'text', nullable: true })
  reviewNote: string | null;

  @Column({ type: 'datetime', nullable: true })
  reviewedAt: Date | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  purchaseOrderId: string | null;

  @ManyToOne('PurchaseOrder', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder: PurchaseOrder | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
