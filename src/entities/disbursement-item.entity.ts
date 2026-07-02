import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { DisbursementBatch } from './disbursement-batch.entity';

export enum ItemStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED  = 'FAILED',
}

@Entity('disbursement_items')
export class DisbursementItem extends BaseEntity {
  @ManyToOne(() => DisbursementBatch, (batch) => batch.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'batchId' })
  batch!: DisbursementBatch;

  @Column()
  batchId!: string;

  @Column()
  recipientName!: string;

  @Column()
  accountNumber!: string;

  @Column()
  bankCode!: string;

  @Column()
  amount!: number;               // In kobo

  @Column({ type: 'enum', enum: ItemStatus, default: ItemStatus.PENDING })
  status!: ItemStatus;

  @Column({ nullable: true })
  nombaTransactionId!: string;

  @Column({ type: 'text', nullable: true })
  failureReason!: string;
}
