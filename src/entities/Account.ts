import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Merchant } from './Merchant';

export enum KycTier {
  TIER_1 = 'TIER_1', // phone only
  TIER_2 = 'TIER_2', // BVN verified
  TIER_3 = 'TIER_3', // BVN + NIN + address
}

export enum AccountStatus {
  ACTIVE    = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  CLOSED    = 'CLOSED',
}

@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  merchantId!: string;

  // ─── Customer Identity ─────────────────────────────────────────────────────
  @Column({ type: 'varchar' })
  firstName!: string;

  @Column({ type: 'varchar' })
  lastName!: string;

  @Column({ type: 'varchar' })
  email!: string;

  @Column({ type: 'varchar' })
  phone!: string;

  @Column({ type: 'varchar', nullable: true })
  bvn!: string;

  @Column({ type: 'varchar', nullable: true })
  nin!: string;

  @Column({ type: 'enum', enum: KycTier, default: KycTier.TIER_1 })
  kycTier!: KycTier;

  // ─── Nomba Virtual Account Details ─────────────────────────────────────────
  // Our reference sent to Nomba on creation — generated and saved BEFORE calling Nomba
  @Column({ type: 'varchar', unique: true })
  nombaAccountRef!: string;

  // 10-digit NUBAN returned by Nomba
  @Column({ type: 'varchar', unique: true })
  nombaAccountNumber!: string;

  @Column({ type: 'varchar' })
  nombaBankName!: string;

  // Bank code for the virtual account's bank — from Nomba provisioning response
  @Column({ type: 'varchar', nullable: true })
  nombaBankCode!: string;

  // Format: "BusinessName / CustomerFullName" — shown on NIP lookup
  @Column({ type: 'varchar' })
  nombaAccountName!: string;

  // Full raw Nomba provisioning response — saved for audit purposes
  @Column({ type: 'jsonb', nullable: true })
  nombaProvisioningResponse!: object;

  // ─── Lifecycle State ───────────────────────────────────────────────────────
  @Column({ type: 'enum', enum: AccountStatus, default: AccountStatus.ACTIVE })
  status!: AccountStatus;

  @Column({ type: 'timestamp', nullable: true })
  suspendedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  closedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  reopenedAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => Merchant)
  @JoinColumn({ name: 'merchantId' })
  merchant!: Merchant;
}
