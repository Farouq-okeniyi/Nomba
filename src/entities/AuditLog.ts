import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // All audit logs are scoped to a merchant — queryable per merchant
  @Column({ type: 'uuid' })
  merchantId!: string;

  // Which entity type changed
  @Column({ type: 'varchar' })
  entityType!: string; // e.g. "Account" | "PaymentExpectation" | "MisplacedPayment" | "Disbursement"

  @Column({ type: 'uuid' })
  entityId!: string;

  // What happened
  @Column({ type: 'varchar' })
  action!: string; // e.g. "ACCOUNT_SUSPENDED" | "PAYMENT_RECEIVED" | "KYC_UPGRADED"

  // Immutable before/after snapshots
  @Column({ type: 'jsonb', nullable: true })
  previousState!: object;

  @Column({ type: 'jsonb' })
  newState!: object;

  // Who/what triggered the change
  @Column({ type: 'varchar' })
  triggeredBy!: string; // e.g. "SYSTEM" | "WEBHOOK" | "API:<merchantId>" | "CRON:reconciliation"

  // Immutable — never updated after insert
  @CreateDateColumn()
  createdAt!: Date;
}
