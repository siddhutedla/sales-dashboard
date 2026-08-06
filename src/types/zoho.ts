// Zoho's custom "Orders" module - the real system of record order managers
// work in. Field names/picklist values below were pulled live from the org
// (getFields on module "Orders"); orderStatus/preorderStatus on the local
// Order model use these exact strings so the two stay in lockstep.
export const ZOHO_ORDER_STATUS_OPTIONS = [
  "-None-",
  "TODO: fill inksoft Order Number",
  "Email Sent",
  "Blanks Shipped (optional)",
  "Sample/Test Print or Mockup Approved (optional)",
  "Payment Sent to Printer",
  "Order Shipped and Tracking Num Sent (Update Inksoft)",
  "Red Alert",
  "Shipped and Stuck in Delivery",
  "Items Received by Customer",
  "Customer Responded - No Order",
] as const;

export const ZOHO_PREORDER_STATUS_OPTIONS = [
  "-None-",
  "Customer Responded - No Order",
  "Collecting Details and Making PO/Order",
  "Pending Approval and Payment",
  "Payment and Approval Received",
  "Cancelled",
] as const;

export interface ZohoOrderResponse {
  id: string;
  Name: string;
  Customer?: { id: string; name?: string } | null;
  Order_Status?: string;
  Preorder_Status?: string;
  Inksoft_Order_Number?: string;
  Logistics_Notes?: string;
  created_time: string;
  modified_time: string;
}

export interface ZohoContactResponse {
  id: string;
  First_Name?: string;
  Last_Name: string;
  Email?: string;
  Phone?: string;
  Mobile?: string;
  Business_Org?: string;
  Mailing_Street?: string;
  Mailing_City?: string;
  Mailing_State?: string;
  Mailing_Zip?: string;
  Mailing_Country?: string;
  Website?: string;
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

// Zoho's /search endpoints return HTTP 204 (no body) instead of an empty
// array when nothing matches - callers must check for that, not just read
// response.data.data.
export interface ZohoSearchResponse<T> {
  data?: T[];
}
