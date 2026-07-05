import { AppDataSource } from '../../config';
import { Transaction, TransactionType, TransactionStatus } from '../../entities/Transaction';
import { ApiError } from '../../middlewares';

const transactionRepository = AppDataSource.getRepository(Transaction);

export interface StatementOptions {
  from?: string;
  to?: string;
  format?: string;
  page: number;
  limit: number;
}

export class TransactionsService {
  static async listByAccount(accountId: string, merchantId: string): Promise<Transaction[]> {
    return await transactionRepository.find({
      where: { accountId, merchantId },
      order: { createdAt: 'DESC' },
    });
  }

  static async getByMerchantRef(merchantTxRef: string, merchantId: string): Promise<Transaction> {
    const tx = await transactionRepository.findOne({
      where: { merchantTxRef, merchantId },
      relations: { account: true },
    });
    if (!tx) {
      throw new ApiError(404, 'Transaction not found', true);
    }
    return tx;
  }

  static async getStatement(accountId: string, merchantId: string, format: 'json' | 'csv'): Promise<any> {
    const transactions = await this.listByAccount(accountId, merchantId);
    
    if (format === 'csv') {
      const header = 'Date,Reference,Type,Amount,Status,SenderName,SenderBank\n';
      const rows = transactions.map(tx => {
        return `${tx.createdAt.toISOString()},${tx.merchantTxRef},${tx.type},${tx.amount},${tx.status},"${tx.senderName || ''}","${tx.senderBank || ''}"`;
      }).join('\n');
      return header + rows;
    }
    
    return transactions;
  }

  static async getMerchantStatement(merchantId: string, options: StatementOptions): Promise<any> {
    const { from, to, format, page, limit } = options;

    const query = transactionRepository.createQueryBuilder('tx')
      .where('tx.merchantId = :merchantId', { merchantId })
      .orderBy('tx.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (from) query.andWhere('tx.createdAt >= :from', { from: new Date(from) });
    if (to) query.andWhere('tx.createdAt <= :to', { to: new Date(to) });

    const [transactions, total] = await query.getManyAndCount();

    // Summary
    const totalInflow = transactions
      .filter(tx => tx.type === TransactionType.INBOUND && tx.status === TransactionStatus.SETTLED)
      .reduce((sum, tx) => sum + Number(tx.amount), 0);

    const totalOutflow = transactions
      .filter(tx => tx.type === TransactionType.OUTBOUND)
      .reduce((sum, tx) => sum + Number(tx.amount), 0);

    if (format === 'csv') {
      const header = 'id,merchantTxRef,accountId,amount,type,status,senderName,senderBank,createdAt\n';
      const rows = transactions.map(tx =>
        `${tx.id},${tx.merchantTxRef},${tx.accountId},${tx.amount},${tx.type},${tx.status},"${tx.senderName || ''}","${tx.senderBank || ''}",${tx.createdAt.toISOString()}`
      ).join('\n');
      return header + rows;
    }

    return {
      merchant: { id: merchantId },
      period: { from: from || null, to: to || null },
      summary: {
        totalInflow,
        totalOutflow,
        totalTransactions: total,
      },
      transactions,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }
}
