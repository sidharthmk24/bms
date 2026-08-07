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
 * RefreshToken — stores hashed refresh tokens for the JWT rotation strategy.
 *
 * Why store hashed tokens: if the DB is compromised, raw tokens can't be used.
 * On refresh, we hash the incoming token and compare to the stored hash.
 *
 * revokedAt: set when the user logs out or a newer token is issued (rotation).
 */
@Entity('refresh_token')
@Index(['userId'])
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /** bcrypt hash of the raw refresh token */
  @Column({ type: 'varchar', length: 255 })
  tokenHash: string;

  @Column({ type: 'datetime' })
  expiresAt: Date;

  @Column({ type: 'datetime', nullable: true })
  revokedAt: Date | null;

  /** Stored to detect token theft across devices */
  @Column({ type: 'varchar', length: 512, nullable: true })
  userAgent: string;

  @CreateDateColumn()
  createdAt: Date;
}
