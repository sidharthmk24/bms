import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Branch } from '../../branches/entities/branch.entity';
import { User } from '../../users/entities/user.entity';
import type { StockTransferItem } from './stock-transfer-item.entity';

export enum StockTransferStatus {
  PENDING = 'PENDING',
  DISPATCHED = 'DISPATCHED',
  RECEIVED = 'RECEIVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

@Entity('stock_transfer')
export class StockTransfer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'transfer_number', type: 'varchar', unique: true, length: 100 })
  transferNumber: string;

  @Column({ name: 'from_branch_id', type: 'varchar', length: 36 })
  fromBranchId: string;

  @ManyToOne(() => Branch, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'from_branch_id' })
  fromBranch: Branch;

  @Column({ name: 'to_branch_id', type: 'varchar', length: 36 })
  toBranchId: string;

  @ManyToOne(() => Branch, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'to_branch_id' })
  toBranch: Branch;

  @Column({ name: 'requested_by_id', type: 'varchar', length: 36, nullable: true })
  requestedById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'requested_by_id' })
  requestedBy: User;

  @Column({ type: 'enum', enum: StockTransferStatus, default: StockTransferStatus.PENDING })
  status: StockTransferStatus;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @OneToMany('StockTransferItem', 'transfer', { cascade: true })
  items: StockTransferItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
