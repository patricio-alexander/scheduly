export const accessStatusOptions = [
  "active",
  "development",
  "maintenance",
  "developer",
  "planned",
] as const;

export type AccessStatus = (typeof accessStatusOptions)[number];

export interface SubscriptionCapability {
  code: string;
  name: string;
  is_active: boolean;
}

export interface SubscriptionSection {
  id: number;
  key: string;
  name: string;
  status: AccessStatus;
  max_records_limit: number | null;
  usage_count: number;
  capabilities: SubscriptionCapability[];
}

export interface SubscriptionModule {
  id: number;
  name: string;
  key: string;
  status: AccessStatus;
  is_maintainer: boolean;
  image_url: string | null;
  is_trial: boolean;
  start_trial: string | null;
  limit_days_trial: number | null;
  end_trial: string | null;
  sections: SubscriptionSection[];
}

export interface SubscriptionInfo {
  id: number;
  plan_name: string;
  period: string;
  status: string;
  start_at: string;
  expires_at: string;
  modules: SubscriptionModule[];
}

export interface SubscriptionState {
  maintenance: boolean;
  subscribed: boolean;
  subscription: SubscriptionInfo | null;
}
