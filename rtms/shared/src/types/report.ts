export interface ReportFilters {
  startDate: string;
  endDate: string;
}

export interface ReportRow {
  clientName: string;
  serviceAvailed: string;
  completionDate: string;
}

export interface ReportResponse {
  rows: ReportRow[];
  period: {
    startDate: string;
    endDate: string;
  };
  totalTransactions: number;
}
