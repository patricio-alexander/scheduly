"use client";

import { formatMoney } from "@/shared/utils/money";
import {
  paymentMethodLabel,
  type PaymentMethodValue,
} from "@/shared/utils/payment-methods";
import type { PurchasesSummaryByMethod } from "../types";
import CreditCard from "@gravity-ui/icons/CreditCard";
import ChartColumn from "@gravity-ui/icons/ChartColumn";
import Wallet from "@gravity-ui/icons/Wallet";
import ShoppingCart from "@gravity-ui/icons/ShoppingCart";

const methodIcon: Record<PaymentMethodValue, typeof Wallet> = {
  cash: Wallet,
  card: CreditCard,
  transfer: ChartColumn,
};

interface Props {
  totalCount: number;
  totalAmount: number;
  byMethod: PurchasesSummaryByMethod[];
  periodLabel: string;
}

export function PurchaseSummary({
  totalCount,
  totalAmount,
  byMethod,
  periodLabel,
}: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div className="col-span-2 rounded-2xl border border-separator bg-surface p-4 sm:col-span-1 lg:col-span-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted">Total comprado</p>
            <p className="mt-1 truncate text-2xl font-bold tabular-nums tracking-tight">
              {formatMoney(totalAmount)}
            </p>
            <p className="mt-1 text-[11px] text-muted">
              {totalCount} compra{totalCount === 1 ? "" : "s"} · {periodLabel}
            </p>
          </div>
          <span className="shrink-0 rounded-xl bg-accent/10 p-2.5 text-accent">
            <ShoppingCart width={18} height={18} />
          </span>
        </div>
      </div>

      {byMethod.map((row) => {
        const Icon = methodIcon[row.method];
        return (
          <div
            key={row.method}
            className="rounded-2xl border border-separator bg-surface p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted">
                  {paymentMethodLabel[row.method]}
                </p>
                <p className="mt-1 truncate text-lg font-bold tabular-nums">
                  {formatMoney(row.amount)}
                </p>
                <p className="mt-1 text-[11px] text-muted">
                  {row.count} pago{row.count === 1 ? "" : "s"}
                </p>
              </div>
              <span className="shrink-0 rounded-xl bg-surface-secondary p-2 text-muted">
                <Icon width={16} height={16} />
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
