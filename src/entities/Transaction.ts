import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Account } from './Account';

export enum TransactionType {
  INBOUND  = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
}

export enum TransactionStatus {
  PENDING   = 'PENDING',
  SETTLED   = 'SETTLED',
  PARTIAL   = 'PARTIAL',
  MISPLACED = 'MISPLACED',
  FAILED    = 'FAILED',
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  merchantId!: string;

  @Column({ type: 'uuid', nullable: true })
  accountId!: string | null;

  // Our reference — generated and saved to DB BEFORE calling Nomba; source of truth for reconciliation
  @Column({ type: 'varchar', unique: true })
  merchantTxRef!: string;

  // Nomba's internal transaction ID — saved but NOT used as source of truth
  @Column({ type: 'varchar', nullable: true })
  nombaTxId!: string;

  // From webhook event.requestId — unique index for idempotency guard
  @Index({ unique: true, sparse: true })
  @Column({ type: 'varchar', nullable: true })
  nombaRequestId!: string;

  // UUID sent to Nomba to prevent duplicate outbound transfers
  @Column({ type: 'uuid', unique: true, nullable: true })
  idempotencyKey!: string;

  // ─── Payment Details (all amounts in KOBO — never use floats) ─────────────
  @Column({ type: 'bigint' })
  amount!: number;

  @Column({ type: 'varchar', default: 'NGN' })
  currency!: string;

  @Column({ type: 'varchar', nullable: true })
  senderName!: string;

  @Column({ type: 'varchar', nullable: true })
  senderBank!: string;

  @Column({ type: 'varchar', nullable: true })
  senderAccountNumber!: string;

  @Column({ type: 'varchar', nullable: true })
  narration!: string;

  @Column({ type: 'enum', enum: TransactionType })
  type!: TransactionType;

  @Column({ type: 'enum', enum: TransactionStatus, default: TransactionStatus.PENDING })
  status!: TransactionStatus;

  // Full raw webhook payload saved immediately on receipt — before any processing
  @Column({ type: 'jsonb', nullable: true })
  rawWebhookPayload!: object | null;

  @Column({ type: 'uuid', nullable: true })
  paymentExpectationId!: string;

  @Column({ type: 'timestamp', nullable: true })
  settledAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  // Relations
  @ManyToOne(() => Account, { nullable: true })
  @JoinColumn({ name: 'accountId' })
  account!: Account | null;
}
