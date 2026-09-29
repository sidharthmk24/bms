import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import type { ExhibitionStockRequest } from './exhibition-stock-request.entity';
import { Book } from '../../catalog/entities/book.entity';

@Entity('exhibition_stock_request_item')
export class ExhibitionStockRequestItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, name: 'request_id' })
  requestId: string;

  @ManyToOne('ExhibitionStockRequest', (r: any) => r.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'request_id' })
  request: ExhibitionStockRequest;

  @Column({ type: 'varchar', length: 36, name: 'book_id' })
  bookId: string;

  @ManyToOne(() => Book, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'book_id' })
  book: Book;

  @Column({ type: 'int', name: 'quantity_requested' })
  quantityRequested: number;

  @Column({ type: 'int', default: 0, name: 'quantity_approved' })
  quantityApproved: number;

  @Column({ type: 'int', default: 0, name: 'quantity_received' })
  quantityReceived: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
