import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { PaymentExpectation } from './payment-expectation.entity';

@Entity('payment_installments')
export class PaymentInstallment extends BaseEntity {
  @ManyToOne(() => PaymentExpectation, (expectation) => expectation.installments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'expectationId' })
  expectation!: PaymentExpectation;

  @Column()
  expectationId!: string;

  @Column({ unique: true })
  nombaTransactionId!: string;

  @Column({ type: 'int' })
  amount!: number;               // In kobo

  @Column({ type: 'timestamp' })
  paidAt!: Date;
}
