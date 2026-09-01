export interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  details?: unknown;
}

export interface ChargilyCheckoutResponse {
  checkout_url: string;
  status?: "created" | "pending" | "paid" | "failed";
  [key: string]: any;
}

export interface ParentSubscription {
  id: string;
  parent_id: string;
  subscription_plan_id: string;
  status: "pending" | "active" | "cancelled";
  created_at?: string;
  updated_at?: string;
  payments?: Payment[];
}

export interface Payment {
  id: string;
  parent_subscription_id: string;
  chargily_session_id: string;
  amount: number;
  currency: string;
  status: "created" | "pending" | "paid" | "failed";
  created_at?: string;
  updated_at?: string;
}
