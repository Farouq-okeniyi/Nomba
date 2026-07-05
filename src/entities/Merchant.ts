import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

export enum MerchantStatus {
  ACTIVE    = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

@Entity('merchants')
export class Merchant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  businessName!: string;

  @Column({ type: 'varchar', unique: true })
  email!: string;

  @Column({ type: 'varchar', nullable: true })
  phone!: string;

  @Column({ type: 'varchar', nullable: true })
  webhookUrl!: string;

  // HMAC secret used to sign outbound webhooks to the merchant — generated on registration
  @Column({ type: 'varchar' })
  webhookSecret!: string;

  // The raw key is shown ONCE on registration and never stored
  // Only the SHA-256 hash is stored here
  @Column({ type: "varchar", unique: true })
  apiKeyHash!: string;

  // First 12 chars of the raw key — safe to display in listings
  // Format: "nva_live_xxxx"
  @Column({ type: "varchar" })
  apiKeyPrefix!: string;

  @Column({ type: "timestamp", nullable: true })
  apiKeyLastUsedAt!: Date;

  // SHA-256 hash of the raw recovery code — shown once at registration, never stored raw
  @Column({ type: 'varchar', nullable: true })
  recoveryCodeHash!: string | null;

  @Column({ type: 'enum', enum: MerchantStatus, default: MerchantStatus.ACTIVE })
  status!: MerchantStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
