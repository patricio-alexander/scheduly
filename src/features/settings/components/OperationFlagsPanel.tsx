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
  DEFAULT_CASH_REGISTER_MODE,
  normalizeCashRegisterMode,
  type CashRegisterMode,
} from "@/shared/utils/cash-register-mode";
import {
  DEFAULT_BOOKING_END_HOUR,
  DEFAULT_BOOKING_START_HOUR,
  normalizeAgendaHours,
} from "@/shared/utils/agenda-hours";
import {
  DEFAULT_PAYROLL_SETTINGS,
  WEEKDAY_OPTIONS,
  normalizePayrollSettings,
} from "@/shared/utils/payroll-settings";
import {
  SettingsRow,
  SettingsSection,
  SettingsSwitch,
} from "./SettingsControls";

type TabId = "inventario" | "comprobantes" | "publico" | "sistema";

export function OperationFlagsPanel({ tab }: { tab: TabId }) {
  const [flags, setFlags] = useState<OperationFlags>(DEFAULT_OPERATION_FLAGS);
  const [bookingStartHour, setBookingStartHour] = useState(
    DEFAULT_BOOKING_START_HOUR,
  );
  const [bookingEndHour, setBookingEndHour] = useState(DEFAULT_BOOKING_END_HOUR);
  const [cashRegisterMode, setCashRegisterMode] = useState<CashRegisterMode>(
    DEFAULT_CASH_REGISTER_MODE,
  );
  const [payrollWeekStartDay, setPayrollWeekStartDay] = useState(
    DEFAULT_PAYROLL_SETTINGS.payrollWeekStartDay,
  );
  const [payrollAllowBranchAdmin, setPayrollAllowBranchAdmin] = useState(
    DEFAULT_PAYROLL_SETTINGS.payrollAllowBranchAdmin,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(apiUrl("/api/settings"), { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error("No se pudo cargar la configuración");
        const json = (await res.json()) as {
          operationFlags?: unknown;
          bookingStartHour?: unknown;
          bookingEndHour?: unknown;
          cashRegisterMode?: unknown;
          payrollWeekStartDay?: unknown;
          payrollAllowBranchAdmin?: unknown;
        };
        if (!cancelled) {
          setFlags(normalizeOperationFlags(json.operationFlags));
          const hours = normalizeAgendaHours({
            bookingStartHour: json.bookingStartHour,
            bookingEndHour: json.bookingEndHour,
          });
          setBookingStartHour(hours.bookingStartHour);
          setBookingEndHour(hours.bookingEndHour);
          setCashRegisterMode(
            normalizeCashRegisterMode(json.cashRegisterMode),
          );
          const payroll = normalizePayrollSettings({
            payrollWeekStartDay:
              typeof json.payrollWeekStartDay === "number"
                ? json.payrollWeekStartDay
                : undefined,
            payrollAllowBranchAdmin:
              typeof json.payrollAllowBranchAdmin === "boolean"
                ? json.payrollAllowBranchAdmin
                : undefined,
          });
          setPayrollWeekStartDay(payroll.payrollWeekStartDay);
          setPayrollAllowBranchAdmin(payroll.payrollAllowBranchAdmin);
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
        body: JSON.stringify({
          operationFlags: flags,
          bookingStartHour,
          bookingEndHour,
          cashRegisterMode,
          payrollWeekStartDay,
          payrollAllowBranchAdmin,
        }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(payload.message || "No se pudo guardar");
      }
      const json = (await res.json()) as {
        operationFlags?: unknown;
        bookingStartHour?: unknown;
        bookingEndHour?: unknown;
        cashRegisterMode?: unknown;
        payrollWeekStartDay?: unknown;
        payrollAllowBranchAdmin?: unknown;
      };
      setFlags(normalizeOperationFlags(json.operationFlags));
      const hours = normalizeAgendaHours({
        bookingStartHour: json.bookingStartHour,
        bookingEndHour: json.bookingEndHour,
      });
      setBookingStartHour(hours.bookingStartHour);
      setBookingEndHour(hours.bookingEndHour);
      setCashRegisterMode(normalizeCashRegisterMode(json.cashRegisterMode));
      const payroll = normalizePayrollSettings({
        payrollWeekStartDay:
          typeof json.payrollWeekStartDay === "number"
            ? json.payrollWeekStartDay
            : undefined,
        payrollAllowBranchAdmin:
          typeof json.payrollAllowBranchAdmin === "boolean"
            ? json.payrollAllowBranchAdmin
            : undefined,
      });
      setPayrollWeekStartDay(payroll.payrollWeekStartDay);
      setPayrollAllowBranchAdmin(payroll.payrollAllowBranchAdmin);
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
          </SettingsSection>
          <SettingsSection
            title="Caja POS"
            hint="Qué controles de producto y stock aparecen en el punto de venta."
          >
            <SettingsRow
              label="Crear producto desde caja"
              description="Muestra el botón + al lado del buscador de producto."
              control={
                <SettingsSwitch
                  checked={flags.cajaAllowCreateProductFromSelect}
                  onChange={(v) => setFlag("cajaAllowCreateProductFromSelect", v)}
                />
              }
            />
            <SettingsRow
              label="Editar producto desde el carrito"
              description="Muestra el lápiz en cada línea del carrito de caja."
              control={
                <SettingsSwitch
                  checked={flags.cajaAllowEditProductFromCart}
                  onChange={(v) => setFlag("cajaAllowEditProductFromCart", v)}
                />
              }
            />
            <SettingsRow
              label="Mostrar stock en caja"
              description="Checkbox «Mostrar stock» para ver existencias en el carrito y el buscador."
              control={
                <SettingsSwitch
                  checked={flags.cajaShowStockToggle}
                  onChange={(v) => setFlag("cajaShowStockToggle", v)}
                />
              }
            />
            <SettingsRow
              label="Autocompletar stock"
              description="Icono en el carrito para poner la cantidad igual al stock disponible."
              control={
                <SettingsSwitch
                  checked={flags.cajaAllowAutocompleteStock}
                  onChange={(v) => setFlag("cajaAllowAutocompleteStock", v)}
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
        <>
          <SettingsSection
            title="Agenda y caja"
            hint="La dueña define el horario de agenda y cómo se opera la caja."
          >
            <SettingsRow
              label="Horario de agenda"
              description="Los empleados solo pueden agendar citas dentro de este rango."
              control={
                <div className="flex items-center gap-2">
                  <select
                    className="rounded-lg border border-separator bg-field-background px-2 py-1.5 text-sm"
                    value={bookingStartHour}
                    onChange={(e) => {
                      setBookingStartHour(Number(e.target.value));
                      setDirty(true);
                    }}
                    aria-label="Hora inicio agenda"
                  >
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={`s-${h}`} value={h}>
                        {String(h).padStart(2, "0")}:00
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-muted">a</span>
                  <select
                    className="rounded-lg border border-separator bg-field-background px-2 py-1.5 text-sm"
                    value={bookingEndHour}
                    onChange={(e) => {
                      setBookingEndHour(Number(e.target.value));
                      setDirty(true);
                    }}
                    aria-label="Hora fin agenda"
                  >
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={`e-${h}`} value={h}>
                        {String(h).padStart(2, "0")}:00
                      </option>
                    ))}
                  </select>
                </div>
              }
            />
            <SettingsRow
              label="Modo de caja"
              description={
                cashRegisterMode === "employee_own"
                  ? "Cada empleado/admin abre y cierra su propia caja."
                  : "Solo el admin abre la caja del local; el personal cobra bajo esa caja."
              }
              control={
                <select
                  className="w-full max-w-[14rem] rounded-lg border border-separator bg-field-background px-2 py-1.5 text-sm"
                  value={cashRegisterMode}
                  onChange={(e) => {
                    setCashRegisterMode(
                      normalizeCashRegisterMode(e.target.value),
                    );
                    setDirty(true);
                  }}
                  aria-label="Modo de caja"
                >
                  <option value="employee_own">Caja propia por persona</option>
                  <option value="branch_shared">
                    Caja compartida del local
                  </option>
                </select>
              }
            />
          </SettingsSection>
          <SettingsSection
            title="Liquidación semanal"
            hint="Semana laboral y quién puede armar el pago semanal."
          >
            <SettingsRow
              label="Inicio de semana"
              description="Por defecto lunes → domingo. La dueña puede cambiar el día de inicio."
              control={
                <select
                  className="w-full max-w-[14rem] rounded-lg border border-separator bg-field-background px-2 py-1.5 text-sm"
                  value={payrollWeekStartDay}
                  onChange={(e) => {
                    setPayrollWeekStartDay(Number(e.target.value));
                    setDirty(true);
                  }}
                  aria-label="Día inicio semana liquidación"
                >
                  {WEEKDAY_OPTIONS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              }
            />
            <SettingsRow
              label="Admin puede armar liquidación"
              description="Ahora deshabilitado: solo la dueña. Si lo activás, cada admin arma la de su sucursal."
              control={
                <SettingsSwitch
                  checked={payrollAllowBranchAdmin}
                  onChange={(v) => {
                    setPayrollAllowBranchAdmin(v);
                    setDirty(true);
                  }}
                />
              }
            />
          </SettingsSection>
          <SettingsSection
            title="Caja POS"
            hint="Qué controles de producto y stock aparecen en el punto de venta."
          >
            <SettingsRow
              label="Crear producto desde caja"
              description="Botón + al lado del buscador de producto."
              control={
                <SettingsSwitch
                  checked={flags.cajaAllowCreateProductFromSelect}
                  onChange={(v) =>
                    setFlag("cajaAllowCreateProductFromSelect", v)
                  }
                />
              }
            />
            <SettingsRow
              label="Editar producto desde el carrito"
              description="Lápiz en cada línea del carrito."
              control={
                <SettingsSwitch
                  checked={flags.cajaAllowEditProductFromCart}
                  onChange={(v) => setFlag("cajaAllowEditProductFromCart", v)}
                />
              }
            />
            <SettingsRow
              label="Mostrar stock en caja"
              description="Checkbox «Mostrar stock» en el listado de venta."
              control={
                <SettingsSwitch
                  checked={flags.cajaShowStockToggle}
                  onChange={(v) => setFlag("cajaShowStockToggle", v)}
                />
              }
            />
            <SettingsRow
              label="Autocompletar stock"
              description="Icono para igualar la cantidad al stock disponible."
              control={
                <SettingsSwitch
                  checked={flags.cajaAllowAutocompleteStock}
                  onChange={(v) => setFlag("cajaAllowAutocompleteStock", v)}
                />
              }
            />
            <SettingsRow
              label="Sugerir actualizar precio al cobrar"
              description="Si el precio del carrito difiere del catálogo."
              control={
                <SettingsSwitch
                  checked={flags.cajaSuggestUpdateProductPrice}
                  onChange={(v) =>
                    setFlag("cajaSuggestUpdateProductPrice", v)
                  }
                />
              }
            />
          </SettingsSection>
          <SettingsSection
            title="Sistema"
            hint="Preferencias generales del panel."
          >
            <SettingsRow
              label="Correcciones financieras"
              description="Permite a dueño/encargado corregir movimientos sensibles."
              control={
                <SettingsSwitch
                  checked={flags.financeAllowAdminCorrections}
                  onChange={(v) =>
                    setFlag("financeAllowAdminCorrections", v)
                  }
                />
              }
            />
          </SettingsSection>
        </>
      ) : null}

      <div className="sticky bottom-4 z-10 flex justify-end" data-tour="settings-flags-save">
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
