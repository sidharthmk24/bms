import {
  Entity, PrimaryColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * SystemSetting — key/value store for chain-wide configuration.
 *
 * PK is the key string (not a UUID) — makes lookups fast and readable.
 * value is JSON so it can hold strings, numbers, arrays, or objects.
 *
 * Seeded keys:
 *   allowed_payment_modes  → ["CASH","UPI"]
 *   default_low_stock_threshold → 5
 *   currency_symbol → "₹"
 *   bill_number_prefix → "BR"
 */
@Entity('system_setting')
export class SystemSetting {
  /** String key — e.g. 'currency_symbol', 'default_low_stock_threshold' */
  @PrimaryColumn({ length: 100 })
  key: string;

  @Column({ type: 'json' })
  value: any;

  @Column({ name: 'updated_by_id', type: 'varchar', length: 36, nullable: true })
  updatedById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'updated_by_id' })
  updatedBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
