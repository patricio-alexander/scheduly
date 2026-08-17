"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Input, Label, toast } from "@heroui/react";
import Layers from "@gravity-ui/icons/Layers";
import { PageHeader } from "@/shared/components/ui";
import { AppNumberField } from "@/shared/components/AppNumberField";
import { BranchSelect, BranchSelector, ProductComboBox, useBranches } from "@/src/features/branches";
import { useProducts } from "@/src/features/products";
import { useAuth } from "@/src/features/auth";
import { apiUrl } from "@/shared/utils/api";
import { branchDisplayLabel } from "@/shared/utils/auth-user";
import { isBranchAdminRole } from "@/shared/utils/roles";

type StockMatrix = {
  branches: Array<{ id: number; name: string; code: string }>;
  products: Array<{
    productId: number;
    name: string;
    totalStock: number;
    branches: Array<{
      branchId: number;
      stock: number;
      minStock: number;
      lowStock: boolean;
    }>;
  }>;
};

type TransferRecord = {
  id: number;
  createdAt: string;
  notes: string;
  fromBranch: { name: string };
  toBranch: { name: string };
  user: { name: string };
  lines: Array<{ quantity: number; product: { name: string } }>;
};

type TransferLine = { productId: number; quantity: number };

export default function MultiStockPage() {
  const { user } = useAuth();
  const isBranchAdmin = isBranchAdminRole(user?.role);
  const userBranchId = user?.branch?.id ?? null;
  const userBranchLabel = branchDisplayLabel(user?.branch ?? null, user?.role);

  const { branches } = useBranches();
  const { products } = useProducts();
  const [filterBranch, setFilterBranch] = useState<number | "all">("all");
  const [matrix, setMatrix] = useState<StockMatrix | null>(null);
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromBranchId, setFromBranchId] = useState<number | null>(null);
  const [toBranchId, setToBranchId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<TransferLine[]>([{ productId: 0, quantity: 1 }]);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (isBranchAdmin && userBranchId) {
      setFromBranchId(userBranchId);
    }
  }, [isBranchAdmin, userBranchId]);

  useEffect(() => {
    if (toBranchId != null && fromBranchId != null && toBranchId === fromBranchId) {
      setToBranchId(null);
    }
  }, [fromBranchId, toBranchId]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const stockUrl = new URL(apiUrl("/api/branches/stock"), window.location.origin);
      if (filterBranch !== "all") stockUrl.searchParams.set("branchId", String(filterBranch));
      const [stockRes, transfersRes] = await Promise.all([
        fetch(stockUrl.toString(), { credentials: "include" }),
        fetch(apiUrl("/api/branches/transfers"), { credentials: "include" }),
      ]);
      const stockJson = await stockRes.json();
      const transfersJson = await transfersRes.json();
      if (stockRes.ok) setMatrix(stockJson);
      if (transfersRes.ok && Array.isArray(transfersJson)) setTransfers(transfersJson);
    } catch {
      toast.danger("Error al cargar multistock");
    } finally {
      setLoading(false);
    }
  }, [filterBranch]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const lowStockCount = useMemo(() => {
    if (!matrix) return 0;
    return matrix.products.reduce(
      (sum, row) => sum + row.branches.filter((b) => b.lowStock).length,
      0,
    );
  }, [matrix]);

  const submitTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fromBranchId == null || fromBranchId <= 0 || toBranchId == null || toBranchId <= 0) {
      toast.danger("Selecciona sucursal origen y destino");
      return;
    }
    if (fromBranchId === toBranchId) {
      toast.danger("Origen y destino deben ser distintos");
      return;
    }
    const validLines = lines.filter((l) => l.productId > 0 && l.quantity > 0);
    if (validLines.length === 0) {
      toast.danger("Agrega al menos un producto");
      return;
    }

    setPending(true);
    try {
      const res = await fetch(apiUrl("/api/branches/transfers"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fromBranchId,
          toBranchId,
          notes,
          lines: validLines,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          json && typeof json === "object" && "message" in json
            ? String(json.message)
            : "Error al transferir",
        );
      }
      toast.success("Transferencia registrada");
      setNotes("");
      setLines([{ productId: 0, quantity: 1 }]);
      if (!isBranchAdmin) setFromBranchId(null);
      setToBranchId(null);
      void loadData();
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Error al transferir");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader
        icon={<Layers width={24} height={24} />}
        title="Multistock"
        description="Stock por sucursal, alertas de reposición y transferencias entre locales"
      />

      <div className="flex flex-wrap items-center gap-3">
        <BranchSelector branches={branches} value={filterBranch} onChange={setFilterBranch} />
        {lowStockCount > 0 ? (
          <span className="rounded-full bg-warning/15 px-3 py-1 text-xs font-semibold text-warning">
            {lowStockCount} alerta{lowStockCount === 1 ? "" : "s"} de stock bajo
          </span>
        ) : null}
      </div>

      {loading || !matrix ? (
        <div className="h-48 animate-pulse rounded-2xl bg-surface-secondary" />
      ) : (
        <section className="overflow-x-auto rounded-2xl border border-separator bg-surface">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-separator text-left text-muted">
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Total</th>
                {matrix.branches.map((b) => (
                  <th key={b.id} className="px-4 py-3">
                    {b.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.products.map((row) => (
                <tr key={row.productId} className="border-b border-separator/60">
                  <td className="px-4 py-3 font-medium">{row.name}</td>
                  <td className="px-4 py-3 tabular-nums">{row.totalStock}</td>
                  {row.branches.map((cell) => (
                    <td
                      key={cell.branchId}
                      className={`px-4 py-3 tabular-nums ${
                        cell.lowStock ? "font-semibold text-warning" : ""
                      }`}
                    >
                      {cell.stock}
                      {cell.lowStock ? (
                        <span className="ml-1 text-[10px] uppercase text-warning">bajo</span>
                      ) : null}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="rounded-2xl border border-separator bg-surface p-4">
        <h2 className="text-base font-semibold">Transferir entre sucursales</h2>
        <form onSubmit={submitTransfer} className="mt-4 flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {isBranchAdmin ? (
              <div>
                <Label className="text-sm font-medium">Origen</Label>
                <div className="mt-1 rounded-xl border border-separator bg-surface-secondary px-3 py-2.5 text-sm font-medium">
                  {userBranchLabel ?? "—"}
                </div>
                <p className="mt-1 text-xs text-muted">Tu sucursal asignada</p>
              </div>
            ) : (
              <BranchSelect
                branches={branches}
                value={fromBranchId}
                onChange={setFromBranchId}
                label="Origen"
                placeholder="Seleccionar origen"
                excludeBranchId={toBranchId}
              />
            )}

            <BranchSelect
              branches={branches}
              value={toBranchId}
              onChange={setToBranchId}
              label="Destino"
              placeholder="Seleccionar destino"
              excludeBranchId={fromBranchId}
            />
          </div>

          <div className="space-y-2">
            {lines.map((line, index) => (
              <div key={index} className="grid gap-2 sm:grid-cols-[1fr_6rem_auto]">
                <ProductComboBox
                  value={line.productId}
                  onChange={(productId) => {
                    setLines((prev) =>
                      prev.map((row, i) => (i === index ? { ...row, productId } : row)),
                    );
                  }}
                  products={products}
                />
                <AppNumberField
                  minValue={1}
                  value={line.quantity}
                  onChange={(quantity) => {
                    setLines((prev) =>
                      prev.map((row, i) =>
                        i === index ? { ...row, quantity: Math.max(1, quantity) } : row,
                      ),
                    );
                  }}
                  inputClassName="w-full"
                />
                <Button
                  type="button"
                  variant="ghost"
                  isDisabled={lines.length <= 1}
                  onPress={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                >
                  Quitar
                </Button>
              </div>
            ))}
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onPress={() => setLines((prev) => [...prev, { productId: 0, quantity: 1 }])}
            >
              Agregar línea
            </Button>
          </div>

          <div>
            <Label htmlFor="transfer-notes" className="text-sm font-medium">
              Notas
            </Label>
            <Input
              id="transfer-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Motivo o referencia..."
              className="mt-1"
            />
          </div>

          <Button type="submit" variant="primary" isDisabled={pending}>
            {pending ? "Transfiriendo..." : "Registrar transferencia"}
          </Button>
        </form>
      </section>

      <section className="rounded-2xl border border-separator bg-surface p-4">
        <h2 className="mb-4 text-base font-semibold">Últimas transferencias</h2>
        {transfers.length === 0 ? (
          <p className="text-sm text-muted">Aún no hay transferencias registradas.</p>
        ) : (
          <ul className="space-y-3">
            {transfers.slice(0, 10).map((t) => (
              <li key={t.id} className="rounded-xl border border-separator/60 p-3 text-sm">
                <p className="font-medium">
                  {t.fromBranch.name} → {t.toBranch.name}
                </p>
                <p className="mt-1 text-muted">
                  {t.lines.map((l) => `${l.product.name} ×${l.quantity}`).join(" · ")}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {new Date(t.createdAt).toLocaleString("es-EC")} · {t.user.name}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
