import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Unique,
} from 'typeorm';
import { DecimalTransformer } from '../../common/transformers/decimal.transformer';
import type { Exhibition } from './exhibition.entity';
import { User } from '../../users/entities/user.entity';

@Entity('exhibition_day_close')
@Unique(['exhibitionId', 'closeDate'])
export class ExhibitionDayClose {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, name: 'exhibition_id' })
  exhibitionId: string;

  @ManyToOne('Exhibition', (e: any) => e.dayCloses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exhibition_id' })
  exhibition: Exhibition;

  @Column({ type: 'date', name: 'close_date' })
  closeDate: string;

  @Column({ type: 'int', name: 'opening_stock', default: 0 })
  openingStock: number;

  @Column({ type: 'int', name: 'quantity_sold', default: 0 })
  quantitySold: number;

  @Column({ type: 'int', name: 'quantity_credit', default: 0 })
  quantityCredit: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'cash_total', default: 0, transformer: DecimalTransformer })
  cashTotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'upi_total', default: 0, transformer: DecimalTransformer })
  upiTotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'counted_cash', default: 0, transformer: DecimalTransformer })
  countedCash: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, transformer: DecimalTransformer })
  variance: number;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'varchar', length: 36, name: 'closed_by_id' })
  closedById: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'closed_by_id' })
  closedBy: User;

  @CreateDateColumn({ name: 'closed_at' })
  closedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
