import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { DecimalTransformer } from '../../common/transformers/decimal.transformer';
import { Bill } from './bill.entity';
import { Book } from '../../catalog/entities/book.entity';

@Entity('bill_item')
export class BillItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'bill_id', length: 36 })
  billId: string;

  @ManyToOne(() => Bill, (bill) => bill.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bill_id' })
  bill: Bill;

  @Column({ type: 'varchar', name: 'book_id', length: 36 })
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
