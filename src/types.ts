export type PlanTier = 'free' | 'starter' | 'pro';
export type SubscriptionStatus = 'active' | 'pilot_trial' | 'grace_period' | 'expired' | 'canceled';
export type PersonaType = 'solo_owner' | 'staff_1_to_4' | 'social_seller';
export type EngagementTier = 'green' | 'yellow' | 'red';
export type TouchpointDay = 'Day 0' | 'Day 1' | 'Day 3' | 'Day 7' | 'Day 14' | 'Day 21' | 'Day 30' | 'Extra Check-in';
export type IssueSeverity = 'blocker' | 'major' | 'minor' | 'feature_request';
export type IssueStatus = 'open' | 'in_progress' | 'resolved';

export interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  role: 'super_admin' | 'admin' | 'field_rep';
  created_at: string;
}

export interface Shop {
  id: string;
  owner_id: string;
  name: string;
  category?: string;
  city: string;
  address?: string;
  phone?: string;
  currency: string;
  timezone: string;
  catalog_slug?: string;
  catalog_status: string;
  plan_tier: PlanTier;
  subscription_status: SubscriptionStatus;
  is_pilot: boolean;
  pilot_cohort?: string | null;
  persona_type?: PersonaType | null;
  pilot_started_at?: string | null;
  plan_expires_at?: string | null;
  engagement_tier_override?: EngagementTier | null;
  would_they_pay?: 'yes' | 'maybe' | 'no' | null;
  churn_or_no_reason?: 'price' | 'missing_feature' | 'reverted_to_habit' | null;
  churn_notes?: string | null;
  created_at: string;
  updated_at: string;
  
  // Computed / joined fields
  product_count?: number;
  sale_count?: number;
  total_revenue?: number;
  debt_count?: number;
  total_debt?: number;
  has_catalog?: boolean;
  computed_tier?: EngagementTier;
  has_open_blocker?: boolean;
}

export interface SubscriptionAuditLog {
  id: string;
  shop_id: string;
  admin_user_id?: string | null;
  previous_plan?: string | null;
  new_plan: string;
  previous_status?: string | null;
  new_status: string;
  expires_at?: string | null;
  reason?: string | null;
  created_at: string;
}

export interface PilotTouchpoint {
  id: string;
  shop_id: string;
  admin_user_id?: string | null;
  touchpoint_day: TouchpointDay;
  usage_signals: string[];
  confusion_point?: string | null;
  feature_request?: string | null;
  sentiment_score?: number | null;
  would_they_pay_signal?: 'yes' | 'maybe' | 'no' | null;
  tier_set?: EngagementTier | null;
  created_at: string;
}

export interface PilotIssue {
  id: string;
  title: string;
  description?: string | null;
  reproduction_steps?: string | null;
  severity: IssueSeverity;
  status: IssueStatus;
  affected_shop_ids: string[];
  reported_by?: string | null;
  created_at: string;
  updated_at: string;
  shop_frequency?: number;
}

export interface Product {
  id: string;
  shop_id: string;
  name: string;
  sku?: string;
  selling_price: number;
  buying_price: number;
  quantity: number;
  status: string;
  catalog_visible: boolean;
  created_at: string;
}

export interface Sale {
  id: string;
  shop_id: string;
  sale_number: string;
  total: number;
  amount_paid: number;
  balance_due: number;
  payment_method: string;
  payment_status: string;
  status: string;
  created_at: string;
}

export interface CustomerDebt {
  id: string;
  shop_id: string;
  customer_id: string;
  customer_name?: string;
  debit: number;
  credit: number;
  balance_after: number;
  due_date?: string;
  note?: string;
  created_at: string;
}
