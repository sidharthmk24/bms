import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, OneToMany,
} from 'typeorm';
import { Branch } from '../../branches/entities/branch.entity';
import { User } from '../../users/entities/user.entity';
import { RestockRequestItem } from './restock-request-item.entity';

export enum RestockRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  PARTIALLY_APPROVED = 'PARTIALLY_APPROVED',
  REJECTED = 'REJECTED',
  FULFILLED = 'FULFILLED',   // central dispatched
  RECEIVED = 'RECEIVED',     // branch confirmed receipt
}

/**
 * RestockRequest — a branch asking central for more stock.
 * Lifecycle: PENDING → APPROVED/PARTIALLY_APPROVED/REJECTED → FULFILLED → RECEIVED
 *
 * The gap between quantityApproved and quantityReceived (on items) is the
 * shipping discrepancy and must stay visible for reconciliation.
 */
@Entity('restock_request')
export class RestockRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'branch_id', type: 'varchar', length: 36 })
  branchId: string;

  @ManyToOne(() => Branch, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @Column({ name: 'requested_by_id', type: 'varchar', length: 36 })
  requestedById: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'requested_by_id' })
  requestedBy: User;

  @Column({ type: 'enum', enum: RestockRequestStatus, default: RestockRequestStatus.PENDING })
  status: RestockRequestStatus;

  @Column({ name: 'reviewed_by_id', type: 'varchar', length: 36, nullable: true })
  reviewedById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewed_by_id' })
  reviewedBy: User;

  @Column({ type: 'text', nullable: true })
  reviewNote: string | null;

  @Column({ type: 'datetime', nullable: true })
  reviewedAt: Date | null;

  @OneToMany(() => RestockRequestItem, (item) => item.restockRequest)
  items: RestockRequestItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
