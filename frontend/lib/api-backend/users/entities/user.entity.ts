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
import { UserRole as UserRoleEnum } from '../enums/user-role.enum';
import { UserRole } from './user-role.entity';
import { Branch } from '../../branches/entities/branch.entity';

@Entity('user')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', unique: true, length: 255 })
  email: string;

  @Column({ type: 'varchar', name: 'password_hash' })
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRoleEnum, name: 'primary_role', nullable: true })
  primaryRole: UserRoleEnum;

  @OneToMany(() => UserRole, (userRole: any) => userRole.user, { cascade: true })
  roles: UserRole[];

  @Column({ type: 'varchar', name: 'branch_id', length: 36, nullable: true })
  branchId: string | null;

  @ManyToOne(() => Branch, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'datetime', name: 'last_login_at', nullable: true })
  lastLoginAt: Date | null;

  @Column({ type: 'varchar', name: 'created_by_id', length: 36, nullable: true })
  createdById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
