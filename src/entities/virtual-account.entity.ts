import { Entity, Column } from 'typeorm';
import { BaseEntity } from './BaseEntity';

export enum VirtualAccountStatus {
  ACTIVE    = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  CLOSED    = 'CLOSED',
}

@Entity('virtual_accounts')
export class VirtualAccount extends BaseEntity {
  @Column({ unique: true })
  nombaAccountId!: string;

  @Column()
  accountNumber!: string;

  @Column()
  accountName!: string;

  @Column()
  customerId!: string;           // Developer's own customer reference

  @Column({ type: 'enum', enum: VirtualAccountStatus, default: VirtualAccountStatus.ACTIVE })
  status!: VirtualAccountStatus;

  @Column({ default: 1 })
  kycTier!: number;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>;
}
