import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum BranchType {
  STORE = 'STORE',
  WAREHOUSE = 'WAREHOUSE',
}

/**
 * Branch — a physical location: a store, or the one central warehouse.
 * Exactly one row has type = WAREHOUSE; it is the central stock's home.
 */
@Entity('branch')
export class Branch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  /** Short identifier used in bill numbers, e.g. 'BR-01', 'WH-01' */
  @Column({ type: 'varchar', unique: true, length: 20 })
  code: string;

  @Column({ type: 'enum', enum: BranchType, default: BranchType.STORE })
  type: BranchType;

  @Column({ type: 'varchar', nullable: true })
  address: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
