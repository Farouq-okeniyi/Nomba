import { Entity, Column } from 'typeorm';
import { BaseEntity } from './BaseEntity';

export enum MisplacedPaymentStatus {
  UNMATCHED    = 'UNMATCHED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  HELD         = 'HELD',
  RECOVERED    = 'RECOVERED',
  REFUNDED     = 'REFUNDED',
}

@Entity('misplaced_payments')
export class MisplacedPayment extends BaseEntity {
  @Column({ unique: true })
  nombaTransactionId!: string;

  @Column()
  amount!: number;               // In kobo

  @Column({ nullable: true })
  senderName!: string;

  @Column({ nullable: true })
  senderBank!: string;

  @Column({ nullable: true })
  accountNumber!: string;        // The virtual account that received it

  @Column({ type: 'enum', enum: MisplacedPaymentStatus, default: MisplacedPaymentStatus.UNMATCHED })
  status!: MisplacedPaymentStatus;

  @Column({ type: 'text', nullable: true })
  notes!: string;

  @Column({ nullable: true })
  resolvedBy!: string;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt!: Date;
}
