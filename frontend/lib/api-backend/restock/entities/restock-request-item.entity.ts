import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import type { RestockRequest } from './restock-request.entity';
import { Book } from '../../catalog/entities/book.entity';

@Entity('restock_request_item')
export class RestockRequestItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'restock_request_id', type: 'varchar', length: 36 })
  restockRequestId: string;

  @ManyToOne('RestockRequest', 'items', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'restock_request_id' })
  restockRequest: RestockRequest;

  @Column({ name: 'book_id', type: 'varchar', length: 36 })
  bookId: string;

  @ManyToOne(() => Book, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'book_id' })
  book: Book;

  @Column({ type: 'int' })
  quantityRequested: number;

  @Column({ type: 'int', default: 0 })
  quantityApproved: number;

  /** May differ from quantityApproved — the discrepancy is the shipping gap */
  @Column({ type: 'int', default: 0 })
  quantityReceived: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
