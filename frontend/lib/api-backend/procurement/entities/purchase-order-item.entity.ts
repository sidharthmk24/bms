import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { DecimalTransformer } from '../../common/transformers/decimal.transformer';
import { PurchaseOrder } from './purchase-order.entity';
import { Book } from '../../catalog/entities/book.entity';

@Entity('purchase_order_item')
export class PurchaseOrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'purchase_order_id', length: 36 })
  purchaseOrderId: string;

  @ManyToOne(() => PurchaseOrder, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder: PurchaseOrder;

  @Column({ type: 'varchar', name: 'book_id', length: 36 })
  bookId: string;

  @ManyToOne(() => Book, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'book_id' })
  book: Book;

  @Column({ type: 'int' })
  quantityOrdered: number;

  /** Incremented as deliveries arrive — may differ from ordered if partial */
  @Column({ type: 'int', default: 0 })
  quantityReceived: number;

  @Column({
    type: 'decimal', precision: 10, scale: 2, default: 0,
    transformer: DecimalTransformer,
  })
  unitCost: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
