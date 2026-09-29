import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Book } from '../../catalog/entities/book.entity';
import { Branch } from '../../branches/entities/branch.entity';
import { User } from '../../users/entities/user.entity';

export enum CreditCopyReason {
  REVIEW = 'REVIEW',
  AUTHOR = 'AUTHOR',
  COMPLIMENTARY = 'COMPLIMENTARY',
  DAMAGED_REPLACEMENT = 'DAMAGED_REPLACEMENT',
}

@Entity('credit_copy')
export class CreditCopy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, name: 'bill_item_id', nullable: true })
  billItemId: string | null;

  @Column({ type: 'varchar', length: 36, name: 'exhibition_id', nullable: true })
  exhibitionId: string | null;

  @Column({ type: 'varchar', length: 36, name: 'book_id' })
  bookId: string;

  @ManyToOne(() => Book, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'book_id' })
  book: Book;

  @Column({ type: 'varchar', length: 36, name: 'branch_id', nullable: true })
  branchId: string | null;

  @ManyToOne(() => Branch, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'varchar', length: 255, name: 'recipient_name' })
  recipientName: string;

  @Column({ type: 'enum', enum: CreditCopyReason, nullable: true })
  reason: CreditCopyReason | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'varchar', length: 36, name: 'issued_by_id' })
  issuedById: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'issued_by_id' })
  issuedBy: User;

  @Column({ type: 'varchar', length: 36, name: 'approved_by_id', nullable: true })
  approvedById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'approved_by_id' })
  approvedBy: User | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

