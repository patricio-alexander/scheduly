export type SubscriptionPlanSection = {
  name: string;
  key: string;
  description: string;
};

export type SubscriptionPlanModule = {
  id?: number | null;
  name: string;
  key: string;
  description: string;
  is_trial?: boolean;
  sections: SubscriptionPlanSection[];
};

export type SubscriptionPlanOffer = {
  offer_id: number;
  offer_name: string;
};

export type SubscriptionCatalogModule = {
  id: number | null;
  key: string;
  name: string;
  description: string;
  status: string | null;
  image_url: string | null;
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
  id?: number | null;
  name: string;
  channel?: string | null;
  sort_order?: number | null;
  prices: SubscriptionPlanPrice[] | Record<string, unknown> | unknown;
  modules: SubscriptionPlanModule[];
  offers?: SubscriptionPlanOffer[];
};
