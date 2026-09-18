export interface LoyaltyReward {
  id: number;
  name: string;
  description: string;
  pointsCost: number;
  isActive: boolean;
  sortOrder: number;
  serviceId: number | null;
  productId: number | null;
  discountPct: number | null;
  service?: { id: number; name: string } | null;
  product?: { id: number; name: string } | null;
  createdAt: string;
}

export type RewardApplyType = "general" | "service" | "product";

export interface RewardFormData {
  name: string;
  description: string;
  pointsCost: number;
  sortOrder: number;
  isActive: boolean;
  applyType: RewardApplyType;
  serviceId: number | null;
  productId: number | null;
  discountPct: number | null;
}

export interface LoyaltyOffer {
  id: number;
  name: string;
  description: string;
  discountPct: number | null;
  discountFixed: number | null;
  comboLabel: string | null;
  startsAt: string;
  endsAt: string | null;
  isActive: boolean;
  serviceIds: unknown;
  branchIds: unknown;
  /** 0=dom … 6=sáb; vacío/null = todos los días */
  weekdays?: number[] | null;
}

export interface OfferFormData {
  name: string;
  description: string;
  discountPct: number | null;
  discountFixed: number | null;
  comboLabel: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  weekdays: number[];
}

export interface CustomerAccountUser {
  id: number;
  name: string;
  lastnames: string;
  email: string;
  phone: string;
  points: number;
  tier: string;
}

export interface CustomerPointTransaction {
  id: number;
  points: number;
  reason: string;
  reward: { id: number; name: string } | null;
  createdAt: string;
}

export interface CustomerAppointment {
  id: number;
  title: string;
  status: string;
  appointmentDate: string;
  branchName: string | null;
  staffName: string | null;
  services: Array<{ id: number; name: string; durationMinutes: number }>;
}

export interface EligibleCustomer {
  id: number;
  name: string;
  lastnames: string;
  email: string;
  phone: string;
  points: number;
  tier: string;
  hasPortalAccess: boolean;
  claimableRewards: Array<{
    id: number;
    name: string;
    description: string;
    pointsCost: number;
    service?: { id: number; name: string } | null;
    product?: { id: number; name: string } | null;
  }>;
  lastRedemption: LoyaltyRedemptionRecord | null;
}

export interface LoyaltyRedemptionRecord {
  id: number;
  customerId: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  points: number;
  redeemedAt: string;
  pendingPickup?: boolean;
  reward: {
    id: number;
    name: string;
    description: string;
    pointsCost: number;
    service?: { id: number; name: string } | null;
    product?: { id: number; name: string } | null;
  };
}

export interface EligibleCustomersResponse {
  customers: EligibleCustomer[];
  recentRedemptions: LoyaltyRedemptionRecord[];
  claimedProducts: LoyaltyRedemptionRecord[];
}
