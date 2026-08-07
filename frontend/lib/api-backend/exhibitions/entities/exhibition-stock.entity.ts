import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Unique,
} from 'typeorm';
import { Exhibition } from './exhibition.entity';
import { Book } from '../../catalog/entities/book.entity';

/**
 * ExhibitionStock — tracks each book taken to an exhibition.
 *
 * Reconciliation rule enforced at close:
 *   quantityTaken = quantitySold + quantityReturned + quantityDamaged + quantityLost
 *
 * The service rejects the close request if this doesn't balance.
 */
@Entity('exhibition_stock')
@Unique(['exhibitionId', 'bookId'])
export class ExhibitionStock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  exhibitionId: string;

  @ManyToOne(() => Exhibition, (e) => e.stock, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exhibition_id' })
  exhibition: Exhibition;

  @Column({ type: 'varchar', length: 36 })
  bookId: string;

  @ManyToOne(() => Book, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'book_id' })
  book: Book;

  @Column({ type: 'int' })
  quantityTaken: number;

  @Column({ type: 'int', default: 0 })
  quantitySold: number;

  @Column({ type: 'int', default: 0 })
  quantityReturned: number;

  @Column({ type: 'int', default: 0 })
  quantityDamaged: number;

  @Column({ type: 'int', default: 0 })
  quantityLost: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
