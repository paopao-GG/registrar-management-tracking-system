import { TransactionStatus } from './transaction';

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
