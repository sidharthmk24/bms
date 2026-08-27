import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, OneToMany,
} from 'typeorm';
import { Branch } from '../../branches/entities/branch.entity';
import { User } from '../../users/entities/user.entity';
import { ExhibitionStock } from './exhibition-stock.entity';

export enum ExhibitionStatus {
  REQUESTED = 'REQUESTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ONGOING = 'ONGOING',
  CLOSED = 'CLOSED',
  OVERDUE = 'OVERDUE',
  EXPIRED = 'EXPIRED',
}

@Entity('exhibition')
export class Exhibition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 300 })
  location: string;

  /** The branch whose stock is taken to the exhibition */
  @Column({ type: 'varchar', length: 36 })
  sourceBranchId: string;

  @ManyToOne(() => Branch, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'source_branch_id' })
  sourceBranch: Branch;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date' })
  endDate: Date;

  @Column({ type: 'enum', enum: ExhibitionStatus, default: ExhibitionStatus.REQUESTED })
  status: ExhibitionStatus;

  @Column({ type: 'varchar', length: 36 })
  requestedById: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'requested_by_id' })
  requestedBy: User;

  @Column({ type: 'varchar', length: 36, nullable: true })
  approvedById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approved_by_id' })
  approvedBy: User;

  @Column({ type: 'varchar', length: 36, nullable: true })
  assignedUserId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_user_id' })
  assignedUser: User;

  @Column({ type: 'varchar', length: 500, nullable: true })
  rejectionReason: string | null;

  @OneToMany(() => ExhibitionStock, (s) => s.exhibition)
  stock: ExhibitionStock[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
