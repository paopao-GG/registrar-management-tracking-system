export type ReportFormat = 'json' | 'arta' | 'bup';

export interface ReportFilters {
  startDate: string;
  endDate: string;
  format?: ReportFormat;
}

/** One row of the ARTA logbook. */
export interface ArtaReportRow {
  clientName: string;
  requestedDocuments: string;
  contactNumber: string;
  email: string;
  transactionDate: string;
  signature: string | null;
}

export interface NameDateTime {
  name: string;
  dateTime: string;
}

/** One row of the BUP logbook. */
export interface BupReportRow {
  date: string;
  name: string;
  sex: string;
  courseYear: string;
  COR: number;
  COG: number;
  GMC: number;
  AUTH: number;
  OTR: number;
  OTHERS: number;
  othersLabel: string;
  preparedBy: NameDateTime;
  reviewedBy: NameDateTime;
  duration: string;
  releasedTo: NameDateTime;
  signature: string | null;
}

export interface ReportResponse {
  rows: ArtaReportRow[];
  period: {
    startDate: string;
    endDate: string;
  };
  totalTransactions: number;
}
