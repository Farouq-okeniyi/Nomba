import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Account } from './Account';

export enum PaymentExpectationStatus {
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  SETTLED = 'SETTLED',
}

@Entity('payment_expectations')
export class PaymentExpectation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  merchantId!: string;

  @Column({ type: 'uuid' })
  accountId!: string;

  // Developer-provided unique reference for this expectation e.g. "ORDER-001"
  @Column({ type: 'varchar', unique: true })
  reference!: string;

  // All amounts in KOBO — never use floats for money
  @Column({ type: 'bigint' })
  expectedAmount!: number;

  @Column({ type: 'bigint', default: 0 })
  amountPaid!: number;

  // Explicit column (not DB-generated) — updated on every installment: expectedAmount - amountPaid
  @Column({ type: 'bigint' })
  outstanding!: number;


  @Column({
    type: 'enum',
    enum: PaymentExpectationStatus,
    default: PaymentExpectationStatus.PENDING,
  })
  status!: PaymentExpectationStatus;

  @Column({ type: 'timestamp', nullable: true })
  settledAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => Account)
  @JoinColumn({ name: 'accountId' })
  account!: Account;
}
