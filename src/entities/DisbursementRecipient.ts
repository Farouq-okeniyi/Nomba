import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Disbursement } from './Disbursement';

export enum RecipientStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED  = 'FAILED',
}

@Entity('disbursement_recipients')
export class DisbursementRecipient {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  merchantId!: string;

  @Column({ type: 'uuid' })
  disbursementId!: string;

  // ─── Recipient Details ─────────────────────────────────────────────────────
  @Column({ type: 'varchar' })
  accountNumber!: string;

  @Column({ type: 'varchar' })
  bankCode!: string;

  // Resolved via Nomba account-name lookup BEFORE transfer is initiated
  @Column({ type: 'varchar' })
  accountName!: string;

  // Amount in KOBO
  @Column({ type: 'bigint' })
  amount!: number;

  @Column({ type: 'varchar', nullable: true })
  narration!: string;

  // Generated and saved to our DB BEFORE calling Nomba — source of truth
  @Column({ type: 'varchar', unique: true })
  merchantTxRef!: string;

  // UUID sent to Nomba to prevent duplicate outbound transfers
  @Column({ type: 'uuid', unique: true, nullable: true })
  idempotencyKey!: string;

  // Link to OUTBOUND Transaction record
  @Column({ type: 'uuid', nullable: true })
  transactionId!: string | null;

  // ─── Nomba Response ────────────────────────────────────────────────────────
  @Column({ type: 'varchar', nullable: true })
  nombaTxId!: string;

  @Column({ type: 'varchar', nullable: true })
  nombaStatus!: string;

  @Column({ type: 'jsonb', nullable: true })
  nombaRawResponse!: object;

  @Column({ type: 'enum', enum: RecipientStatus, default: RecipientStatus.PENDING })
  status!: RecipientStatus;

  @Column({ type: 'text', nullable: true })
  failureReason!: string;

  // ─── Retry Tracking ────────────────────────────────────────────────────────
  @Column({ type: 'int', default: 0 })
  retryCount!: number;

  @Column({ type: 'timestamp', nullable: true })
  lastRetriedAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => Disbursement, (d) => d.recipients)
  @JoinColumn({ name: 'disbursementId' })
  disbursement!: Disbursement;
}
