"use client";

import { useEffect, useState } from "react";
import { Button, toast } from "@heroui/react";
import { apiUrl } from "@/shared/utils/api";
import {
  DEFAULT_OPERATION_FLAGS,
  normalizeOperationFlags,
  type OperationFlags,
} from "@/shared/utils/operation-flags";
import { SCHEDULY_DEPLOYMENT } from "@/shared/utils/multi-branch";
import {
  SettingsRow,
  SettingsSection,
  SettingsSwitch,
} from "./SettingsControls";

type TabId = "inventario" | "comprobantes" | "publico" | "sistema";

export function OperationFlagsPanel({ tab }: { tab: TabId }) {
  const [flags, setFlags] = useState<OperationFlags>(DEFAULT_OPERATION_FLAGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(apiUrl("/api/settings"), { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error("No se pudo cargar la configuración");
        const json = (await res.json()) as { operationFlags?: unknown };
        if (!cancelled) {
          setFlags(normalizeOperationFlags(json.operationFlags));
          setDirty(false);
        }
      })
      .catch((err: unknown) => {
        toast.danger(err instanceof Error ? err.message : "Error al cargar");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab]);

  const setFlag = (key: keyof OperationFlags, value: boolean) => {
    setFlags((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(apiUrl("/api/settings"), {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operationFlags: flags }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(payload.message || "No se pudo guardar");
      }
      const json = (await res.json()) as { operationFlags?: unknown };
      setFlags(normalizeOperationFlags(json.operationFlags));
      setDirty(false);
      toast.success("Configuración guardada");
    } catch (err: unknown) {
      toast.danger(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-40 animate-pulse rounded-2xl bg-surface-secondary" />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      {tab === "inventario" ? (
        <>
          <SettingsSection
            title="Inventario y caja"
            hint="Opciones operativas del salón (misma lógica que EdDeli)."
          >
            <SettingsRow
              label="Multistock (stock por local)"
              description={`Siempre activo en ${SCHEDULY_DEPLOYMENT.productName}. No se puede desactivar.`}
              control={
                <SettingsSwitch
                  checked
                  disabled
                  lockedLabel="Siempre ON"
                  onChange={() => undefined}
                />
              }
            />
            <SettingsRow
              label="Mostrar costo en selects"
              description="Muestra el costo en selectores de productos al comprar."
              control={
                <SettingsSwitch
                  checked={flags.showProductCostInSelect}
                  onChange={(v) => setFlag("showProductCostInSelect", v)}
                />
              }
            />
            <SettingsRow
              label="Correcciones financieras (Admin)"
              description="Permite a dueño/encargado corregir movimientos sensibles."
              control={
                <SettingsSwitch
                  checked={flags.financeAllowAdminCorrections}
                  onChange={(v) => setFlag("financeAllowAdminCorrections", v)}
                />
              }
            />
            <SettingsRow
              label="Crear producto desde caja"
              description="Botón + en el buscador de productos de caja."
              control={
                <SettingsSwitch
                  checked={flags.cajaAllowCreateProductFromSelect}
                  onChange={(v) => setFlag("cajaAllowCreateProductFromSelect", v)}
                />
              }
            />
            <SettingsRow
              label="Editar producto desde carrito"
              description="Permite ajustar el ítem desde el carrito de caja."
              control={
                <SettingsSwitch
                  checked={flags.cajaAllowEditProductFromCart}
                  onChange={(v) => setFlag("cajaAllowEditProductFromCart", v)}
                />
              }
            />
            <SettingsRow
              label="Sugerir actualizar precio al cobrar"
              description="Si el precio del carrito difiere del catálogo."
              control={
                <SettingsSwitch
                  checked={flags.cajaSuggestUpdateProductPrice}
                  onChange={(v) => setFlag("cajaSuggestUpdateProductPrice", v)}
                />
              }
            />
          </SettingsSection>
          <SettingsSection
            title="Columnas en tablas"
            hint="Qué columnas se muestran en Ventas y Compras."
          >
            <SettingsRow
              label="Columna Cliente en ventas"
              description="Muestra el cliente en el hub de Ventas e ingresos."
              control={
                <SettingsSwitch
                  checked={flags.salesShowCustomerColumn}
                  onChange={(v) => setFlag("salesShowCustomerColumn", v)}
                />
              }
            />
            <SettingsRow
              label="Columna Proveedor en compras"
              description="Muestra el proveedor en el hub de Compras."
              control={
                <SettingsSwitch
                  checked={flags.purchasesShowSupplierColumn}
                  onChange={(v) => setFlag("purchasesShowSupplierColumn", v)}
                />
              }
            />
            <SettingsRow
              label="Columna Sucursal"
              description="Muestra la sucursal/local en ventas y compras."
              control={
                <SettingsSwitch
                  checked={flags.showBranchColumn}
                  onChange={(v) => setFlag("showBranchColumn", v)}
                />
              }
            />
          </SettingsSection>
        </>
      ) : null}

      {tab === "comprobantes" ? (
        <SettingsSection
          title="Detalle de comprobantes"
          hint="Formato de líneas en tickets y facturas."
        >
          <SettingsRow
            label="Número de línea"
            description="Muestra 1., 2., … en el detalle."
            control={
              <SettingsSwitch
                checked={flags.receiptShowLineNumber}
                onChange={(v) => setFlag("receiptShowLineNumber", v)}
              />
            }
          />
          <SettingsRow
            label="Código / barras"
            description="Muestra código junto al nombre del ítem."
            control={
              <SettingsSwitch
                checked={flags.receiptShowBarcode}
                onChange={(v) => setFlag("receiptShowBarcode", v)}
              />
            }
          />
          <SettingsRow
            label="Unidad de medida"
            description="Abreviatura de unidad en cada línea."
            control={
              <SettingsSwitch
                checked={flags.receiptShowUnit}
                onChange={(v) => setFlag("receiptShowUnit", v)}
              />
            }
          />
          <SettingsRow
            label="Aplicar a factura SRI"
            description="Usa este formato en facturas electrónicas."
            control={
              <SettingsSwitch
                checked={flags.receiptApplyToFactura}
                onChange={(v) => setFlag("receiptApplyToFactura", v)}
              />
            }
          />
          <SettingsRow
            label="Aplicar a ticket POS"
            description="Usa este formato en comprobantes de caja."
            control={
              <SettingsSwitch
                checked={flags.receiptApplyToNotaVenta}
                onChange={(v) => setFlag("receiptApplyToNotaVenta", v)}
              />
            }
          />
        </SettingsSection>
      ) : null}

      {tab === "publico" ? (
        <SettingsSection
          title="Canal público"
          hint="Qué ve el cliente sin iniciar sesión."
        >
          <SettingsRow
            label="Mostrar catálogo"
            description="Catálogo público de servicios/productos."
            control={
              <SettingsSwitch
                checked={flags.showPublicCatalog}
                onChange={(v) => setFlag("showPublicCatalog", v)}
              />
            }
          />
          <SettingsRow
            label="Mostrar sucursales"
            description="Lista de locales en la vista pública."
            control={
              <SettingsSwitch
                checked={flags.showPublicBranches}
                onChange={(v) => setFlag("showPublicBranches", v)}
              />
            }
          />
        </SettingsSection>
      ) : null}

      {tab === "sistema" ? (
        <SettingsSection
          title="Sistema"
          hint="Preferencias generales del panel."
        >
          <SettingsRow
            label="Correcciones financieras"
            description="Atajo: mismo flag que en Inventario."
            control={
              <SettingsSwitch
                checked={flags.financeAllowAdminCorrections}
                onChange={(v) => setFlag("financeAllowAdminCorrections", v)}
              />
            }
          />
        </SettingsSection>
      ) : null}

      <div className="sticky bottom-4 z-10 flex justify-end">
        <Button
          variant="primary"
          isDisabled={!dirty || saving}
          onPress={() => void save()}
        >
          {saving ? "Guardando…" : "Guardar configuración"}
        </Button>
      </div>
    </div>
  );
}
