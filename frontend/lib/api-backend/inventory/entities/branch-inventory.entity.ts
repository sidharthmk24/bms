import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Unique,
} from 'typeorm';
import { Branch } from '../../branches/entities/branch.entity';
import { Book } from '../../catalog/entities/book.entity';

/**
 * BranchInventory — how many copies of each book a specific branch has.
 *
 * @Unique(['branchId','bookId']) is both the business key and the primary
 * lookup index — every branch has at most one row per book.
 *
 * quantity is the running total, updated atomically by stock.helper.ts.
 * NEVER read quantity, subtract in JS, and write back — always use
 * the conditional UPDATE helper to prevent race conditions.
 */
@Entity('branch_inventory')
@Unique(['branchId', 'bookId'])
export class BranchInventory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'branch_id', type: 'varchar', length: 36 })
  branchId: string;

  @ManyToOne(() => Branch, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @Column({ name: 'book_id', type: 'varchar', length: 36 })
  bookId: string;

  @ManyToOne(() => Book, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'book_id' })
  book: Book;

  @Column({ type: 'int', default: 0 })
  quantity: number;

  /** Low-stock alert threshold — branch-specific */
  @Column({ type: 'int', default: 5 })
  reorderThreshold: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
