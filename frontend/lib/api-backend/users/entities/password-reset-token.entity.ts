import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

/**
 * PasswordResetToken — one-use, time-limited tokens for the forgot-password flow.
 *
 * usedAt: set when the token is consumed; subsequent use attempts are rejected.
 * expiresAt: typically 1 hour from creation.
 */
@Entity('password_reset_token')
@Index(['userId'])
export class PasswordResetToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /** sha256 hash of the raw token sent in the reset link */
  @Column({ type: 'varchar', length: 255 })
  tokenHash: string;

  @Column({ type: 'datetime' })
  expiresAt: Date;

  /** Set when the token is successfully used — prevents replay */
  @Column({ type: 'datetime', nullable: true })
  usedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
