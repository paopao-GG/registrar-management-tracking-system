export enum TransactionStatus {
  PENDING = 'Pending',
  PROCESSING = 'Processing',
  READY_FOR_RELEASE = 'Ready for Release',
  RELEASED = 'Released',
}

export interface RequestedDocuments {
  COR: number;
  COG: number;
  CMC: number;
  AUTH: number;
  OTR: number;
}

export interface ITransaction {
  _id: string;
  studentId: string;
  studentName: string;
  studentCourse: string;
  studentYearLevel: number;
  requestedDocuments: RequestedDocuments;
  others: string;
  othersCount: number;
  status: TransactionStatus;
  preparedBy: string;
  preparedByName: string;
  preparedAt: Date;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: Date;
  duration?: number;
  releasedTo?: string;
  signature?: string;
  releasedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTransactionDTO {
  studentId: string;
  requestedDocuments: RequestedDocuments;
  others: string;
  othersCount: number;
}

export interface ReleaseTransactionDTO {
  releasedTo: string;
  signature: string;
}
