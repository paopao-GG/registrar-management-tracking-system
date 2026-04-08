import { TransactionStatus } from './transaction.js';

export interface IAuditLog {
  _id: string;
  transactionId: string;
  action: string;
  previousStatus: TransactionStatus | null;
  newStatus: TransactionStatus;
  performedBy: string;
  performedByName: string;
  timestamp: Date;
}
