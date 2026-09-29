import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn, Unique,
} from 'typeorm';
import type { Exhibition } from './exhibition.entity';
import { User } from '../../users/entities/user.entity';

export enum ExhibitionAssignmentRole {
  LEAD = 'LEAD',
  STAFF = 'STAFF',
}

@Entity('exhibition_assignment')
@Unique(['exhibitionId', 'userId'])
export class ExhibitionAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, name: 'exhibition_id' })
  exhibitionId: string;

  @ManyToOne('Exhibition', (e: any) => e.assignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exhibition_id' })
  exhibition: Exhibition;

  @Column({ type: 'varchar', length: 36, name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: ExhibitionAssignmentRole, default: ExhibitionAssignmentRole.STAFF })
  role: ExhibitionAssignmentRole;

  @Column({ type: 'varchar', length: 36, name: 'assigned_by_id', nullable: true })
  assignedById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assigned_by_id' })
  assignedBy: User | null;

  @CreateDateColumn({ name: 'assigned_at' })
  assignedAt: Date;
}
