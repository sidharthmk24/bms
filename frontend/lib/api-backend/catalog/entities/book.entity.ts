import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { DecimalTransformer } from '../../common/transformers/decimal.transformer';
import { Author } from './author.entity';
import { Publisher } from './publisher.entity';
import { Category } from './category.entity';

/**
 * Book — the master catalog, shared across all branches.
 *
 * barcode defaults to ISBN when no separate internal barcode is needed.
 * barcode is the billing lookup field — indexed for fast scans.
 *
 * price is the current selling price. BillItem.unitPrice captures the price
 * AT SALE TIME so historical bills are never affected by price changes.
 * costPrice is optional — used for margin reporting in Finance.
 */
@Entity('book')
@Index(['title'])     // non-unique search index for catalog listing
export class Book {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Column({ type: 'varchar', unique: true, length: 50 })
  isbn: string;

  /**
   * barcode defaults to ISBN. Indexed for fast O(log n) billing lookup.
   * Unique per physical product.
   */
  @Column({ type: 'varchar', unique: true, length: 100 })
  barcode: string;

  @Column({ type: 'varchar', type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'decimal', precision: 10, scale: 2,
    transformer: DecimalTransformer,
  })
  price: number;

  @Column({
    type: 'decimal', precision: 10, scale: 2,
    nullable: true, transformer: DecimalTransformer,
  })
  costPrice: number | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  coverImageUrl: string;

  @Column({ type: 'varchar', name: 'author_id', type: 'varchar', length: 36 })
  authorId: string;

  @ManyToOne(() => Author, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'author_id' })
  author: Author;

  @Column({ type: 'varchar', name: 'publisher_id', type: 'varchar', length: 36 })
  publisherId: string;

  @ManyToOne(() => Publisher, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'publisher_id' })
  publisher: Publisher;

  @Column({ type: 'varchar', name: 'category_id', type: 'varchar', length: 36 })
  categoryId: string;

  @ManyToOne(() => Category, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
