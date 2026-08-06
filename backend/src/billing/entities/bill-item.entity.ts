import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { DecimalTransformer } from '../../common/transformers/decimal.transformer';
import { Bill } from './bill.entity';
import { Book } from '../../catalog/entities/book.entity';

/**
 * BillItem — one line on a bill.
 *
 * CRITICAL: unitPrice is the price AT SALE TIME, captured when the bill
 * is created. NEVER join to Book.price when displaying a historical bill —
 * the book's price may have changed since the sale.
 *
 * lineTotal = quantity × unitPrice (discount applied at the Bill level).
 */
@Entity('bill_item')
export class BillItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'bill_id', type: 'varchar', length: 36 })
  billId: string;

  @ManyToOne(() => Bill, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'bill_id' })
  bill: Bill;

  @Column({ name: 'book_id', type: 'varchar', length: 36 })
  bookId: string;

  @ManyToOne(() => Book, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'book_id' })
  book: Book;

  @Column({ type: 'int' })
  quantity: number;

  /** Price at the moment of sale — immutable after creation */
  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: DecimalTransformer })
  unitPrice: number;

  /** Cost at the moment of sale to calculate true profit later */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, transformer: DecimalTransformer })
  unitCost: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: DecimalTransformer })
  lineTotal: number;

  @CreateDateColumn()
  createdAt: Date;
}
