import { PaymentExpectation, PaymentExpectationStatus } from '../../entities/payment-expectation.entity';
import { PaymentInstallment } from '../../entities/payment-installment.entity';

export interface PaymentExpectationDto {
  id: string;
  object: 'payment_expectation';
  merchantId: string;
  accountId: string;
  reference: string;
  expectedAmount: number;
  amountPaid: number;
  outstanding: number;
  status: PaymentExpectationStatus;
  settledAt: Date | null;
  createdAt: Date;
}

export interface PaymentInstallmentDto {
  id: string;
  object: 'payment_installment';
  merchantId: string;
  paymentExpectationId: string;
  transactionId: string;
  amount: number;
  runningTotal: number;
  outstandingAfter: number;
  createdAt: Date;
}

export const toPaymentExpectationDto = (expectation: PaymentExpectation): PaymentExpectationDto => {
  return {
    id: expectation.id,
    object: 'payment_expectation',
    merchantId: expectation.merchantId,
    accountId: expectation.accountId,
    reference: expectation.reference,
    expectedAmount: expectation.expectedAmount,
    amountPaid: expectation.amountPaid,
    outstanding: expectation.outstanding,
    status: expectation.status,
    settledAt: expectation.settledAt || null,
    createdAt: expectation.createdAt,
  };
};

export const toPaymentInstallmentDto = (installment: PaymentInstallment): PaymentInstallmentDto => {
  return {
    id: installment.id,
    object: 'payment_installment',
    merchantId: installment.merchantId,
    paymentExpectationId: installment.paymentExpectationId,
    transactionId: installment.transactionId,
    amount: installment.amount,
    runningTotal: installment.runningTotal,
    outstandingAfter: installment.outstandingAfter,
    createdAt: installment.createdAt,
  };
};
