import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { DisbursementRecipient } from './DisbursementRecipient';

export enum DisbursementStatus {
  PENDING           = 'PENDING',
  PROCESSING        = 'PROCESSING',
  COMPLETED         = 'COMPLETED',
  PARTIALLY_FAILED  = 'PARTIALLY_FAILED',
  FAILED            = 'FAILED',
}

@Entity('disbursements')
export class Disbursement {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  merchantId!: string;

  // Developer-provided unique batch reference
  @Column({ type: 'varchar', unique: true })
  reference!: string;

  @Column({ type: 'varchar', nullable: true })
  narration!: string;

  // All amounts in KOBO
  @Column({ type: 'bigint' })
  totalAmount!: number;

  @Column({ type: 'int' })
  totalRecipients!: number;

  @Column({ type: 'int', default: 0 })
  totalSuccess!: number;

  @Column({ type: 'int', default: 0 })
  totalFailed!: number;

  @Column({ type: 'int', default: 0 })
  totalPending!: number;

  @Column({
    type: 'enum',
    enum: DisbursementStatus,
    default: DisbursementStatus.PENDING,
  })
  status!: DisbursementStatus;

  @Column({ type: 'timestamp', nullable: true })
  completedAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @OneToMany(() => DisbursementRecipient, (r) => r.disbursement)
  recipients!: DisbursementRecipient[];
}
