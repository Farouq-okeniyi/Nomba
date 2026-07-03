import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('webhook_events')
export class WebhookEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  merchantId!: string;

  // UNIQUE INDEX — this is our primary idempotency guard
  // A duplicate requestId insert throws a DB unique violation → we catch → return 200 without re-processing
  @Index({ unique: true })
  @Column({ type: 'varchar' })
  requestId!: string;

  // e.g. virtual_account.funded, transfer.success, transfer.failed
  @Column({ type: 'varchar' })
  eventType!: string;

  // Full raw body saved IMMEDIATELY before any processing begins
  @Column({ type: 'jsonb' })
  rawPayload!: object;

  @Column({ type: 'boolean', default: false })
  signatureVerified!: boolean;

  @Column({ type: 'boolean', default: false })
  processed!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  processedAt!: Date;

  // Populated if processing threw an unhandled error
  @Column({ type: 'text', nullable: true })
  processingError!: string;

  @Column({ type: 'timestamp' })
  receivedAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;
}
