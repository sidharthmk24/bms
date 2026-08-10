import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Book } from '../../catalog/entities/book.entity';
import { Branch } from '../../branches/entities/branch.entity';
import { User } from '../../users/entities/user.entity';

export enum EnquiryStatus {
  OPEN = 'OPEN',
  STOCK_REQUESTED = 'STOCK_REQUESTED',
  NEW_TITLE_REQUESTED = 'NEW_TITLE_REQUESTED',
  FULFILLED = 'FULFILLED',
  CLOSED = 'CLOSED',
}

/**
 * BookEnquiry — a customer asking about a book we don't have in stock.
 *
 * Either bookId (book is in catalog, just out of stock) or freeTextTitle
 * (book is not in catalog at all) must be present — enforced at service layer.
 *
 * These enquiries feed the demand summary dashboard for the Central Inventory Manager.
 */
@Entity('book_enquiry')
export class BookEnquiry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Set if the book IS in the catalog (just out of stock at this branch) */
  @Column({ name: 'book_id', type: 'varchar', length: 36, nullable: true })
  bookId: string | null;

  @ManyToOne(() => Book, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'book_id' })
  book: Book;

  /** Set if the book is NOT in the catalog (new title request) */
  @Column({ type: 'varchar', nullable: true })
  freeTextTitle: string | null;

  @Column({ name: 'branch_id', type: 'varchar', length: 36 })
  branchId: string;

  @ManyToOne(() => Branch, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @Column({ name: 'logged_by_id', type: 'varchar', length: 36 })
  loggedById: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'logged_by_id' })
  loggedBy: User;

  @Column({ type: 'varchar', length: 150, nullable: true })
  customerName: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  customerPhone: string | null;

  @Column({ type: 'enum', enum: EnquiryStatus, default: EnquiryStatus.OPEN })
  status: EnquiryStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
