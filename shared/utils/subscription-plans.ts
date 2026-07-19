export type SubscriptionPlanModule = {
  name: string;
  description: string;
};

export type SubscriptionPlanPrice = {
  amount?: number | string | null;
  price?: number | string | null;
  currency?: string | null;
  period?: string | null;
  interval?: string | null;
  label?: string | null;
  [key: string]: unknown;
};

export type SubscriptionPlan = {
  name: string;
  prices: SubscriptionPlanPrice[] | Record<string, unknown> | unknown;
  modules: SubscriptionPlanModule[];
};
