import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { StockTransfer } from './stock-transfer.entity';
import { Book } from '../../catalog/entities/book.entity';

@Entity('stock_transfer_item')
export class StockTransferItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'transfer_id', type: 'varchar', length: 36 })
  transferId: string;

  @ManyToOne('StockTransfer', 'items', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transfer_id' })
  transfer: StockTransfer;

  @Column({ name: 'book_id', type: 'varchar', length: 36 })
  bookId: string;

  @ManyToOne(() => Book, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'book_id' })
  book: Book;

  @Column({ name: 'quantity_requested', type: 'int' })
  quantityRequested: number;

  @Column({ name: 'quantity_dispatched', type: 'int', default: 0 })
  quantityDispatched: number;

  @Column({ name: 'quantity_received', type: 'int', default: 0 })
  quantityReceived: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
