import { apiUrl } from "@/shared/utils/api";
import type {
  CustomerAccountUser,
  CustomerPointTransaction,
  EligibleCustomer,
  EligibleCustomersResponse,
  LoyaltyRedemptionRecord,
  LoyaltyOffer,
  LoyaltyReward,
  OfferFormData,
  RewardFormData,
} from "../types";

const REWARDS = apiUrl("/api/loyalty/rewards");
const PROMOTIONS = apiUrl("/api/promotions");

export async function fetchRewards(): Promise<LoyaltyReward[]> {
  const res = await fetch(apiUrl("/api/loyalty/rewards"), { credentials: "include" });
  if (!res.ok) throw new Error("Error al cargar premios");
  return res.json();
}

export async function createReward(data: RewardFormData): Promise<LoyaltyReward> {
  const res = await fetch(REWARDS, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "Error al crear premio");
  }
  return res.json();
}

export async function updateReward(
  id: number,
  data: RewardFormData,
): Promise<LoyaltyReward> {
  const res = await fetch(`${REWARDS}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "Error al actualizar premio");
  }
  return res.json();
}

export async function deleteReward(id: number): Promise<void> {
  const res = await fetch(`${REWARDS}/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Error al eliminar premio");
}

export async function fetchEligibleCustomers(): Promise<EligibleCustomersResponse> {
  const res = await fetch(apiUrl("/api/loyalty/eligible-customers"), {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Error al cargar clientes elegibles");
  return res.json();
}

export async function fetchOffers(all = true): Promise<LoyaltyOffer[]> {
  const res = await fetch(`${PROMOTIONS}?all=${all ? "1" : "0"}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Error al cargar ofertas");
  return res.json();
}

export async function createOffer(data: OfferFormData): Promise<LoyaltyOffer> {
  const res = await fetch(PROMOTIONS, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "Error al crear oferta");
  }
  return res.json();
}

export async function updateOffer(
  id: number,
  data: OfferFormData,
): Promise<LoyaltyOffer> {
  const res = await fetch(`${PROMOTIONS}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "Error al actualizar oferta");
  }
  return res.json();
}

export async function deleteOffer(id: number): Promise<void> {
  const res = await fetch(`${PROMOTIONS}/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Error al eliminar oferta");
}

export async function loginCustomer(
  email: string,
  password: string,
): Promise<CustomerAccountUser> {
  const res = await fetch(apiUrl("/api/customer-auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "Error al iniciar sesión");
  }
  return res.json();
}

export async function logoutCustomer(): Promise<void> {
  await fetch(apiUrl("/api/customer-auth/logout"), {
    method: "POST",
    credentials: "include",
  }).catch(() => undefined);
}

export async function fetchCustomerAccount(): Promise<{
  customer: CustomerAccountUser;
  rewards: LoyaltyReward[];
  transactions: CustomerPointTransaction[];
  loyaltyRules: {
    pointsPerAppointment: number;
    silverThreshold: number;
    goldThreshold: number;
  };
}> {
  const res = await fetch(apiUrl("/api/customer-auth/me"), {
    credentials: "include",
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "Error al cargar cuenta");
  }
  return res.json();
}

export async function redeemReward(rewardId: number): Promise<{
  message: string;
  customer: CustomerAccountUser;
  pointsAfter: number;
}> {
  const res = await fetch(apiUrl("/api/loyalty/redeem"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ rewardId }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "Error al canjear");
  }
  return res.json();
}

export async function redeemRewardForCustomerAsAdmin(
  customerId: number,
  rewardId: number,
): Promise<{
  message: string;
  pointsAfter: number;
  tier: string;
  reward: { id: number; name: string; pointsCost: number };
}> {
  const res = await fetch(apiUrl("/api/loyalty/redeem/admin"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ customerId, rewardId }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "Error al canjear");
  }
  return res.json();
}
