import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PaymentExpectation } from './payment-expectation.entity';
import { Transaction } from './Transaction';

@Entity('payment_installments')
export class PaymentInstallment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  merchantId!: string;

  @Column({ type: 'uuid' })
  paymentExpectationId!: string;

  // The Transaction that funded this installment
  @Column({ type: 'uuid' })
  transactionId!: string;

  // Amount of this specific installment in KOBO
  @Column({ type: 'bigint' })
  amount!: number;

  // Running total of amountPaid AFTER this installment is applied
  @Column({ type: 'bigint' })
  runningTotal!: number;

  // Outstanding AFTER this installment (expectedAmount - runningTotal)
  @Column({ type: 'bigint' })
  outstandingAfter!: number;

  @CreateDateColumn()
  createdAt!: Date;

  // Relations
  @ManyToOne(() => PaymentExpectation)
  @JoinColumn({ name: 'paymentExpectationId' })
  paymentExpectation!: PaymentExpectation;

  @ManyToOne(() => Transaction)
  @JoinColumn({ name: 'transactionId' })
  transaction!: Transaction;
}
