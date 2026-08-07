import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * AuditLog — permanent log of sensitive actions.
 *
 * Written by AuditService (injected into feature services).
 * beforeJson / afterJson capture entity state snapshots for diff display.
 * NEVER delete these rows.
 */
@Entity('audit_log')
@Index(['entityType', 'entityId'])
@Index(['createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /** Human-readable action code e.g. BOOK_PRICE_UPDATED, USER_DEACTIVATED */
  @Column({ type: 'varchar', type: 'varchar', length: 100 })
  action: string;

  /** Name of the entity type e.g. 'Book', 'User', 'Bill' */
  @Column({ type: 'varchar', type: 'varchar', length: 100 })
  entityType: string;

  @Column({ type: 'varchar', type: 'varchar', length: 36, nullable: true })
  entityId: string | null;

  @Column({ type: 'json', nullable: true })
  beforeJson: object | null;

  @Column({ type: 'json', nullable: true })
  afterJson: object | null;

  @Column({ type: 'varchar', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
