import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { PaymentInstallment } from './payment-installment.entity';

export enum ExpectationStatus {
  PENDING   = 'PENDING',
  PARTIAL   = 'PARTIAL',
  COMPLETE  = 'COMPLETE',
  OVERPAID  = 'OVERPAID',
}

@Entity('payment_expectations')
export class PaymentExpectation extends BaseEntity {
  @Column({ unique: true })
  reference!: string;            // Developer's unique reference (e.g. ORDER-001)

  @Column()
  customerId!: string;

  @Column({ type: 'int' })
  expectedAmount!: number;       // In kobo — set by developer

  @Column({ type: 'int', default: 0 })
  amountReceived!: number;       // Running total of installments

  @Column({ type: 'int', generatedType: 'STORED', asExpression: '"expectedAmount" - "amountReceived"', nullable: true })
  outstandingBalance!: number;

  @Column({ type: 'enum', enum: ExpectationStatus, default: ExpectationStatus.PENDING })
  status!: ExpectationStatus;

  @Column({ type: 'timestamp', nullable: true })
  dueDate!: Date;

  @OneToMany(() => PaymentInstallment, (installment: PaymentInstallment) => installment.expectation, { cascade: true })
  installments!: PaymentInstallment[];
}
