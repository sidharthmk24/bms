import {
  Entity,
  PrimaryGeneratedColumn,

  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { UserRole as UserRoleEnum } from '../enums/user-role.enum';
import { User as _UserValue } from './user.entity';
import type { User as UserType } from './user.entity';

@Entity('user_roles')
@Unique(['userId', 'role'])
export class UserRole {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  userId: string;

  @Column({ type: 'enum', enum: UserRoleEnum })
  role: UserRoleEnum;

  @ManyToOne(() => _UserValue, (user: any) => user.roles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserType;

  @CreateDateColumn()
  createdAt: Date;
}
