import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Book } from '../../catalog/entities/book.entity';

export enum NewTitleRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

/**
 * NewTitleRequest — aggregates demand for books not yet in the catalog.
 * Created from BookEnquiry records (freeTextTitle) once demand is clear.
 * enquiryCount tracks how many customers asked — helps prioritise procurement.
 */
@Entity('new_title_request')
export class NewTitleRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', type: 'text' })
  freeTextTitle: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  author: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  isbn: string | null;

  @Column({ type: 'varchar', type: 'varchar', length: 36 })
  requestedById: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'requested_by_id' })
  requestedBy: User;

  @Column({ type: 'int', default: 1 })
  enquiryCount: number;

  @Column({ type: 'enum', enum: NewTitleRequestStatus, default: NewTitleRequestStatus.PENDING })
  status: NewTitleRequestStatus;

  @Column({ type: 'varchar', type: 'varchar', length: 36, nullable: true })
  reviewedById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewed_by_id' })
  reviewedBy: User;

  /** Set when approved and the book is added to the catalog */
  @Column({ type: 'varchar', type: 'varchar', length: 36, nullable: true })
  createdBookId: string | null;

  @ManyToOne(() => Book, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_book_id' })
  createdBook: Book;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
