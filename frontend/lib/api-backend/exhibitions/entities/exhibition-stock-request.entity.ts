import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany,
} from 'typeorm';
import type { Exhibition } from './exhibition.entity';
import { User } from '../../users/entities/user.entity';
import { Branch } from '../../branches/entities/branch.entity';
import type { ExhibitionStockRequestItem } from './exhibition-stock-request-item.entity';
import { StockSourceType } from './exhibition-stock-source.entity';

export enum ExhibitionStockRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  PARTIALLY_APPROVED = 'PARTIALLY_APPROVED',
  REJECTED = 'REJECTED',
  DISPATCHED = 'DISPATCHED',
  RECEIVED = 'RECEIVED',
}

@Entity('exhibition_stock_request')
export class ExhibitionStockRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, name: 'exhibition_id' })
  exhibitionId: string;

  @ManyToOne('Exhibition', (e: any) => e.stockRequests, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exhibition_id' })
  exhibition: Exhibition;

  @Column({ type: 'varchar', length: 36, name: 'requested_by_id' })
  requestedById: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'requested_by_id' })
  requestedBy: User;

  @Column({ type: 'enum', enum: StockSourceType, name: 'source_type', default: StockSourceType.WAREHOUSE })
  sourceType: StockSourceType;

  @Column({ type: 'varchar', length: 36, name: 'source_branch_id', nullable: true })
  sourceBranchId: string | null;

  @ManyToOne(() => Branch, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'source_branch_id' })
  sourceBranch: Branch | null;

  @Column({
    type: 'enum',
    enum: ExhibitionStockRequestStatus,
    default: ExhibitionStockRequestStatus.PENDING,
  })
  status: ExhibitionStockRequestStatus;

  @Column({ type: 'varchar', length: 36, name: 'reviewed_by_id', nullable: true })
  reviewedById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'reviewed_by_id' })
  reviewedBy: User | null;

  @Column({ type: 'varchar', length: 500, name: 'review_note', nullable: true })
  reviewNote: string | null;

  @OneToMany('ExhibitionStockRequestItem', (item: any) => item.request)
  items: ExhibitionStockRequestItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
