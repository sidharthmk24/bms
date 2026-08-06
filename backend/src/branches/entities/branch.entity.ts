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

  @Column({ length: 150 })
  name: string;

  /** Short identifier used in bill numbers, e.g. 'BR-01', 'WH-01' */
  @Column({ unique: true, length: 20 })
  code: string;

  @Column({ type: 'enum', enum: BranchType, default: BranchType.STORE })
  type: BranchType;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ length: 100, nullable: true })
  city: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
