import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { UserRole as UserRoleEnum } from '../enums/user-role.enum';
import { UserRole } from './user-role.entity';
import { Branch } from '../../branches/entities/branch.entity';

/**
 * User — every staff member in the system.
 *
 * Key rules enforced at the service layer (not here):
 * - branchId MUST be set for BRANCH_* roles
 * - branchId MUST be null for SUPER_ADMIN, ADMIN, CENTRAL_INVENTORY_MANAGER
 * - FINANCE may have either
 *
 * Soft delete: never hard-delete — set isActive = false.
 * Their historical bills must survive.
 */
@Entity('user')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  name: string;

  /** Email is the login identifier — must be unique across the system.
   * unique:true already creates an index; no separate @Index() needed. */
  @Column({ unique: true, length: 255 })
  email: string;

  /** bcrypt hash at cost 10 — never stored or returned as plaintext */
  @Column()
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRoleEnum, name: 'primary_role', nullable: true })
  primaryRole: UserRoleEnum;

  @OneToMany(() => UserRole, (userRole) => userRole.user, { cascade: true })
  roles: UserRole[];



  /** null for chain-wide roles (SUPER_ADMIN, ADMIN, CENTRAL_INVENTORY_MANAGER) */
  @Column({ name: 'branch_id', type: 'varchar', length: 36, nullable: true })
  branchId: string | null;

  @ManyToOne(() => Branch, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  /** Soft delete — bills, movements, and audit logs still reference this user */
  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'datetime', nullable: true })
  lastLoginAt: Date | null;

  /** Who created this user — nullable for the first SUPER_ADMIN seeded manually */
  @Column({ name: 'created_by_id', type: 'varchar', length: 36, nullable: true })
  createdById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
