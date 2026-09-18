"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Person from "@gravity-ui/icons/Person";
import CrownDiamond from "@gravity-ui/icons/CrownDiamond";
import Gift from "@gravity-ui/icons/Gift";
import { Button, Chip, toast, useOverlayState } from "@heroui/react";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { customerFullName } from "@/shared/utils/person-name";
import { formatRewardApplyLabel } from "@/shared/utils/reward-apply";
import { ContentCard, EmptyState } from "@/shared/components/ui";
import { appRoutes } from "@/shared/utils/app-routes";
import * as loyaltyService from "../services/loyalty-service";
import type { EligibleCustomer, LoyaltyRedemptionRecord } from "../types";

const tierLabel: Record<string, string> = {
  bronze: "Bronce",
  silver: "Plata",
  gold: "Oro",
};

function formatRedeemedAt(iso: string) {
  return new Date(iso).toLocaleString("es-EC", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function RewardDetail({
  reward,
  align = "left",
}: {
  reward: {
    name: string;
    description: string;
    pointsCost: number;
    service?: { name: string } | null;
    product?: { name: string } | null;
  };
  align?: "left" | "right";
}) {
  const applyLabel = formatRewardApplyLabel(reward);

  return (
    <div className={align === "right" ? "text-right" : "text-left"}>
      <p className="font-medium">{reward.name}</p>
      {reward.description ? (
        <p className="mt-0.5 text-xs text-muted">{reward.description}</p>
      ) : null}
      {applyLabel ? (
        <p className="mt-1 text-xs font-medium text-accent">{applyLabel}</p>
      ) : (
        <p className="mt-1 text-xs text-muted">Beneficio general</p>
      )}
      <p className="mt-1 text-xs font-semibold text-accent">{reward.pointsCost} pts</p>
    </div>
  );
}

export function EligibleCustomersPanel() {
  const [customers, setCustomers] = useState<EligibleCustomer[]>([]);
  const [recentRedemptions, setRecentRedemptions] = useState<LoyaltyRedemptionRecord[]>([]);
  const [claimedProducts, setClaimedProducts] = useState<LoyaltyRedemptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deliverTarget, setDeliverTarget] = useState<LoyaltyRedemptionRecord | null>(null);
  const [deliveringId, setDeliveringId] = useState<number | null>(null);
  const deliverConfirm = useOverlayState();

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const data = await loyaltyService.fetchEligibleCustomers();
      setCustomers(data.customers ?? []);
      setRecentRedemptions(data.recentRedemptions ?? []);
      setClaimedProducts(data.claimedProducts ?? []);
    } catch {
      setCustomers([]);
      setRecentRedemptions([]);
      setClaimedProducts([]);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const openDeliverConfirm = (entry: LoyaltyRedemptionRecord) => {
    setDeliverTarget(entry);
    deliverConfirm.open();
  };

  const handleConfirmDeliver = async () => {
    if (!deliverTarget) return;
    setDeliveringId(deliverTarget.id);
    try {
      const result = await loyaltyService.markRewardDelivered(deliverTarget.id);
      toast.success(result.message);
      deliverConfirm.close();
      setDeliverTarget(null);
      await load({ silent: true });
    } catch (error) {
      toast.danger(
        error instanceof Error ? error.message : "No se pudo confirmar la entrega",
      );
    } finally {
      setDeliveringId(null);
    }
  };

  if (loading) {
    return (
      <ContentCard>
        <div className="p-4 sm:p-6">
          <p className="text-sm text-muted">Cargando clientes...</p>
        </div>
      </ContentCard>
    );
  }

  const emptyEligible = customers.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <ContentCard>
        <div className="flex flex-col gap-4 p-4 sm:p-6">
          <div>
            <h2 className="text-base font-semibold">Reclamados para entregar</h2>
            <p className="text-sm text-muted">
              Clientes que pidieron canjear un premio de producto. Confirmá
              Entregado cuando se lo den en el local.
            </p>
          </div>

          {claimedProducts.length === 0 ? (
            <p className="text-sm text-muted">
              Nadie ha reclamado un premio de producto todavía.
            </p>
          ) : (
            <ul className="divide-y divide-separator">
              {claimedProducts.map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="flex min-w-0 gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success">
                      <Gift width={18} height={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium">{entry.customerName}</p>
                      <p className="text-sm text-muted">
                        {[entry.customerPhone, entry.customerEmail]
                          .filter(Boolean)
                          .join(" · ") || "Sin contacto"}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {formatRedeemedAt(entry.redeemedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex min-w-0 flex-col items-stretch gap-2 sm:max-w-sm sm:items-end">
                    <Chip size="sm" variant="primary">
                      Pendiente de entrega
                    </Chip>
                    <RewardDetail reward={entry.reward} align="right" />
                    <Button
                      size="sm"
                      variant="primary"
                      isDisabled={deliveringId === entry.id}
                      onPress={() => openDeliverConfirm(entry)}
                    >
                      {deliveringId === entry.id ? "Confirmando..." : "Entregado"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </ContentCard>

      {emptyEligible ? (
        <ContentCard>
          <EmptyState
            icon={<CrownDiamond width={32} height={32} />}
            title="Sin clientes listos para canjear"
            description="Aparecerán aquí cuando tengan puntos suficientes para un premio de producto."
          />
        </ContentCard>
      ) : (
        <ContentCard>
          <div className="flex flex-col gap-4 p-4 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Pueden reclamar producto</h2>
                <p className="text-sm text-muted">
                  {customers.length}{" "}
                  {customers.length === 1
                    ? "cliente con puntos"
                    : "clientes con puntos"}{" "}
                  suficientes para un premio de producto.
                </p>
              </div>
              <Link
                href={appRoutes.sales.customers}
                className="text-sm font-semibold text-accent hover:underline"
              >
                Ver todos los clientes →
              </Link>
            </div>

            <ul className="divide-y divide-separator">
              {customers.map((customer) => (
                <li
                  key={customer.id}
                  className="flex flex-col gap-4 py-4 first:pt-0 last:pb-0 lg:flex-row lg:items-start lg:justify-between"
                >
                  <div className="flex min-w-0 gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                      <Person width={18} height={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium">
                        {customerFullName(customer)}
                      </p>
                      <p className="text-sm text-muted">
                        {customer.email} · {customer.phone}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-accent/10 px-2 py-0.5 text-sm font-bold tabular-nums text-accent">
                          {customer.points} pts
                        </span>
                        <Chip size="sm" variant="secondary">
                          {tierLabel[customer.tier] ?? customer.tier}
                        </Chip>
                        {customer.hasPortalAccess ? (
                          <Chip size="sm" variant="primary">
                            Portal activo
                          </Chip>
                        ) : (
                          <Chip size="sm" variant="secondary">
                            Sin portal
                          </Chip>
                        )}
                      </div>
                      {customer.lastRedemption ? (
                        <div className="mt-3 rounded-xl border border-separator/60 bg-surface-secondary/20 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                            Último premio canjeado
                          </p>
                          <div className="mt-1">
                            <RewardDetail reward={customer.lastRedemption.reward} />
                            <p className="mt-1 text-xs text-muted">
                              {formatRedeemedAt(customer.lastRedemption.redeemedAt)}
                            </p>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="min-w-0 lg:max-w-sm lg:text-right">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Puede reclamar
                    </p>
                    <ul className="mt-2 space-y-2">
                      {customer.claimableRewards.map((reward) => (
                        <li
                          key={reward.id}
                          className="rounded-xl border border-separator/60 bg-surface-secondary/20 p-3 lg:text-right"
                        >
                          <RewardDetail reward={reward} align="right" />
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </ContentCard>
      )}

      <ContentCard>
        <div className="flex flex-col gap-4 p-4 sm:p-6">
          <div>
            <h2 className="text-base font-semibold">Premios canjeados recientemente</h2>
            <p className="text-sm text-muted">
              Historial de los últimos canjes registrados en el sistema.
            </p>
          </div>

          {recentRedemptions.length === 0 ? (
            <p className="text-sm text-muted">Aún no hay canjes registrados.</p>
          ) : (
            <ul className="divide-y divide-separator">
              {recentRedemptions.map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="flex min-w-0 gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success">
                      <Gift width={18} height={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium">{entry.customerName}</p>
                      <p className="text-xs text-muted">{formatRedeemedAt(entry.redeemedAt)}</p>
                    </div>
                  </div>
                  <div className="min-w-0 sm:max-w-sm sm:text-right">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Premio obtenido
                    </p>
                    <div className="mt-1">
                      <RewardDetail reward={entry.reward} align="right" />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </ContentCard>

      {deliverTarget ? (
        <ConfirmDialog
          state={deliverConfirm}
          title="Confirmar entrega"
          status="success"
          confirmLabel="Marcar entregado"
          pending={deliveringId === deliverTarget.id}
          description={
            <p>
              ¿Confirmás que le entregaron{" "}
              <strong>{deliverTarget.reward.name}</strong> a{" "}
              <strong>{deliverTarget.customerName}</strong> en el local?
            </p>
          }
          onConfirm={handleConfirmDeliver}
        />
      ) : null}
    </div>
  );
}
