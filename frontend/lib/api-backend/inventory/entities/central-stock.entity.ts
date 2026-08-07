import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Book } from '../../catalog/entities/book.entity';

/**
 * CentralStock — the warehouse's pool of each book.
 *
 * One row per book (bookId is unique here).
 * quantity is the running total — updated atomically via stock.helper.ts.
 * The permanent log of every change is in StockMovement.
 */
@Entity('central_stock')
export class CentralStock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'book_id', unique: true, length: 36 })
  bookId: string;

  @ManyToOne(() => Book, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'book_id' })
  book: Book;

  @Column({ type: 'int', default: 0 })
  quantity: number;

  /** Alert fires when quantity drops below this */
  @Column({ type: 'int', default: 20 })
  reorderThreshold: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
