export interface ZohoLeadResponse {
  id: string;
  Last_Name: string;
  Company: string;
  Email?: string;
  Phone?: string;
  Annual_Revenue?: number;
  Lead_Status?: string;
  Description?: string;
  created_time: string;
  modified_time: string;
}

export interface ZohoApiResponse<T> {
  data: T[];
  info?: {
    count: number;
    page: number;
    per_page: number;
    page_context?: {
      has_more_records: boolean;
    };
  };
}
