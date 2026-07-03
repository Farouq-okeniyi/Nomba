import { AppDataSource } from '../../config';
import { Transaction } from '../../entities/Transaction';
import { ApiError } from '../../middlewares';

const transactionRepository = AppDataSource.getRepository(Transaction);

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
}
