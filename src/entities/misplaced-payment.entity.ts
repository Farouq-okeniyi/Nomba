import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Account } from './Account';

export enum MisplacedPaymentReason {
  ACCOUNT_SUSPENDED    = 'ACCOUNT_SUSPENDED',
  ACCOUNT_CLOSED       = 'ACCOUNT_CLOSED',
  ACCOUNT_NOT_FOUND    = 'ACCOUNT_NOT_FOUND',
  NO_EXPECTATION_FOUND = 'NO_EXPECTATION_FOUND',
}

export enum MisplacedPaymentStatus {
  PENDING  = 'PENDING',
  RESOLVED = 'RESOLVED',
}

export enum MisplacedPaymentResolution {
  REROUTED   = 'REROUTED',
  REFUNDED   = 'REFUNDED',
  WRITTEN_OFF = 'WRITTEN_OFF',
}

@Entity('misplaced_payments')
export class MisplacedPayment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  merchantId!: string | null;

  // The account the payment landed on (may be suspended or closed)
  @Column({ type: 'uuid', nullable: true })
  accountId!: string;

  // ─── Payment Details (all amounts in KOBO) ─────────────────────────────────
  @Column({ type: 'bigint' })
  amount!: number;

  @Column({ type: 'varchar', nullable: true })
  senderName!: string;

  @Column({ type: 'varchar', nullable: true })
  senderBank!: string;

  @Column({ type: 'varchar', nullable: true })
  senderAccountNumber!: string;

  @Column({ type: 'varchar', nullable: true })
  narration!: string;

  // The virtual account NUBAN it arrived on
  @Column({ type: 'varchar' })
  receivedOnAccountNumber!: string;

  // Full raw webhook payload — saved immediately on receipt
  @Column({ type: 'jsonb' })
  rawWebhookPayload!: object;

  // Why this payment was flagged as misplaced
  @Column({ type: 'enum', enum: MisplacedPaymentReason })
  reason!: MisplacedPaymentReason;

  // ─── Resolution ───────────────────────────────────────────────────────────
  @Column({
    type: 'enum',
    enum: MisplacedPaymentStatus,
    default: MisplacedPaymentStatus.PENDING,
  })
  status!: MisplacedPaymentStatus;

  @Column({ type: 'enum', enum: MisplacedPaymentResolution, nullable: true })
  resolutionAction!: MisplacedPaymentResolution;

  @Column({ type: 'text', nullable: true })
  resolutionNote!: string;

  @Column({ type: 'varchar', nullable: true })
  resolvedBy!: string;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt!: Date;

  // If REROUTED — which account received the funds
  @Column({ type: 'uuid', nullable: true })
  reroutedToAccountId!: string;

  // If REFUNDED — our merchantTxRef for the refund transfer
  @Column({ type: 'varchar', nullable: true })
  refundMerchantTxRef!: string;

  @Column({ type: 'timestamp' })
  receivedAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  // Relations
  @ManyToOne(() => Account, { nullable: true })
  @JoinColumn({ name: 'accountId' })
  account!: Account;
}
