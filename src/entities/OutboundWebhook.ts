import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum OutboundWebhookStatus {
  PENDING   = 'PENDING',
  DELIVERED = 'DELIVERED',
  FAILED    = 'FAILED',
}

@Entity('outbound_webhooks')
export class OutboundWebhook {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  merchantId!: string;

  // e.g. account.provisioned, payment.received, disbursement.completed
  @Column({ type: 'varchar' })
  eventType!: string;

  @Column({ type: 'jsonb' })
  payload!: object;

  // Merchant's configured webhook URL at time of creation
  @Column({ type: 'varchar' })
  url!: string;

  @Column({ type: 'enum', enum: OutboundWebhookStatus, default: OutboundWebhookStatus.PENDING })
  status!: OutboundWebhookStatus;

  @Column({ type: 'int', default: 0 })
  attempts!: number;

  @Column({ type: 'timestamp', nullable: true })
  lastAttemptAt!: Date;

  // Exponential backoff schedule: 5s → 30s → 5m → 30m → 2h
  @Column({ type: 'timestamp', nullable: true })
  nextRetryAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt!: Date;

  @Column({ type: 'int', nullable: true })
  lastResponseCode!: number;

  @Column({ type: 'text', nullable: true })
  lastResponseBody!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
