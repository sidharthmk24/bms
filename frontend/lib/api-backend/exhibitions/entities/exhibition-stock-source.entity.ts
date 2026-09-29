import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import type { ExhibitionStock } from './exhibition-stock.entity';
import { Branch } from '../../branches/entities/branch.entity';

export enum StockSourceType {
  WAREHOUSE = 'WAREHOUSE',
  BRANCH = 'BRANCH',
}

@Entity('exhibition_stock_source')
export class ExhibitionStockSource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, name: 'exhibition_stock_id' })
  exhibitionStockId: string;

  @ManyToOne('ExhibitionStock', (es: any) => es.sources, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exhibition_stock_id' })
  exhibitionStock: ExhibitionStock;

  @Column({ type: 'enum', enum: StockSourceType, name: 'source_type' })
  sourceType: StockSourceType;

  @Column({ type: 'varchar', length: 36, name: 'source_branch_id', nullable: true })
  sourceBranchId: string | null;

  @ManyToOne(() => Branch, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'source_branch_id' })
  sourceBranch: Branch | null;

  @Column({ type: 'int', default: 0, name: 'quantity_taken' })
  quantityTaken: number;

  @Column({ type: 'int', default: 0, name: 'quantity_returned' })
  quantityReturned: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
