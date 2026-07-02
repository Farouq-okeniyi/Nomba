import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { DisbursementItem } from './disbursement-item.entity';

export enum BatchStatus {
  PENDING         = 'PENDING',
  PROCESSING      = 'PROCESSING',
  COMPLETED       = 'COMPLETED',
  PARTIAL_FAILURE = 'PARTIAL_FAILURE',
  FAILED          = 'FAILED',
}

@Entity('disbursement_batches')
export class DisbursementBatch extends BaseEntity {
  @Column()
  label!: string;                // e.g. "June 2026 Salaries"

  @Column()
  totalAmount!: number;          // Sum of all recipient amounts in kobo

  @Column()
  recipientCount!: number;

  @Column({ type: 'enum', enum: BatchStatus, default: BatchStatus.PENDING })
  status!: BatchStatus;

  @Column({ type: 'timestamp', nullable: true })
  executedAt!: Date;

  @OneToMany(() => DisbursementItem, (item) => item.batch, { cascade: true })
  items!: DisbursementItem[];
}
