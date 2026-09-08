"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Label, toast } from "@heroui/react";
import File from "@gravity-ui/icons/File";
import Shield from "@gravity-ui/icons/Shield";
import TrashBin from "@gravity-ui/icons/TrashBin";
import { apiUrl } from "@/shared/utils/api";
import { SelectField } from "@/shared/components/SelectField";

type SriStatus = {
  enabled: boolean;
  hasCertificate: boolean;
  certFileName: string | null;
  environment: "pruebas" | "produccion";
  autoEmitOnPayment: boolean;
  readyForInvoicing: boolean;
  uploadedAt: string | null;
  ruc: string;
  legalName: string;
  tradeName: string;
  matrixAddress: string;
  establishmentAddress: string;
  establishmentCode: string;
  emissionPointCode: string;
  phone: string;
  email: string;
  accountingRequired: boolean;
  specialTaxpayerResolution: string;
  taxRegime: string;
  nextInvoiceSequential: number;
};

export function SriCertificateForm({
  onEnvironmentChange,
}: {
  onEnvironmentChange?: (env: "pruebas" | "produccion") => void;
} = {}) {
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<SriStatus | null>(null);
  const [environment, setEnvironment] = useState<"pruebas" | "produccion">(
    "pruebas",
  );
  const [autoEmitOnPayment, setAutoEmitOnPayment] = useState(false);
  const [billing, setBilling] = useState({
    ruc: "",
    legalName: "",
    tradeName: "",
    matrixAddress: "",
    establishmentAddress: "",
    establishmentCode: "001",
    emissionPointCode: "001",
    phone: "",
    email: "",
    accountingRequired: true,
    specialTaxpayerResolution: "",
    taxRegime: "",
    nextInvoiceSequential: 1,
  });
  const [password, setPassword] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/sri"), { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          typeof json?.message === "string"
            ? json.message
            : "No se pudo cargar",
        );
      }
      setStatus(json as SriStatus);
      const env =
        json.environment === "produccion" ? "produccion" : "pruebas";
      setEnvironment(env);
      setAutoEmitOnPayment(Boolean(json.autoEmitOnPayment));
      setBilling({
        ruc: String(json.ruc ?? ""),
        legalName: String(json.legalName ?? ""),
        tradeName: String(json.tradeName ?? ""),
        matrixAddress: String(json.matrixAddress ?? ""),
        establishmentAddress: String(json.establishmentAddress ?? ""),
        establishmentCode: String(json.establishmentCode ?? "001"),
        emissionPointCode: String(json.emissionPointCode ?? "001"),
        phone: String(json.phone ?? ""),
        email: String(json.email ?? ""),
        accountingRequired: Boolean(json.accountingRequired ?? true),
        specialTaxpayerResolution: String(json.specialTaxpayerResolution ?? ""),
        taxRegime: String(json.taxRegime ?? ""),
        nextInvoiceSequential: Number(json.nextInvoiceSequential ?? 1) || 1,
      });
      onEnvironmentChange?.(env);
    } catch (e) {
      toast.danger(e instanceof Error ? e.message : "Error al cargar SRI");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.danger("Selecciona el archivo .p12");
      return;
    }
    if (!password.trim()) {
      toast.danger("Ingresa la contraseña del certificado");
      return;
    }

    setPending(true);
    try {
      const form = new FormData();
      form.set("certificate", file);
      form.set("password", password.trim());
      form.set("environment", environment);

      const res = await fetch(apiUrl("/api/sri"), {
        method: "PUT",
        body: form,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          typeof json?.message === "string"
            ? json.message
            : "No se pudo guardar el certificado",
        );
      }
      setStatus(json as SriStatus);
      setFile(null);
      setPassword("");
      if (fileRef.current) fileRef.current.value = "";
      onEnvironmentChange?.(
        json.environment === "produccion" ? "produccion" : "pruebas",
      );
      toast.success("Certificado de firma guardado");
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setPending(false);
    }
  };

  const onRemove = async () => {
    setPending(true);
    try {
      const res = await fetch(apiUrl("/api/sri"), { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          typeof json?.message === "string"
            ? json.message
            : "No se pudo eliminar",
        );
      }
      setStatus(json as SriStatus);
      setFile(null);
      setPassword("");
      toast.success("Certificado eliminado");
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setPending(false);
    }
  };

  const saveBilling = async () => {
    setPending(true);
    try {
      const res = await fetch(apiUrl("/api/sri"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: autoEmitOnPayment,
          environment,
          ...billing,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.message ?? "No se pudo guardar");
      }
      setStatus(json as SriStatus);
      toast.success("Datos fiscales SRI guardados");
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setPending(false);
    }
  };

  const saveAutoEmit = async (enabled: boolean) => {
    setAutoEmitOnPayment(enabled);
    try {
      const res = await fetch(apiUrl("/api/sri"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoEmitOnPayment: enabled }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.message ?? "No se pudo guardar");
      }
      setStatus(json as SriStatus);
      toast.success(
        enabled
          ? "Facturación automática activada"
          : "Facturación automática desactivada",
      );
    } catch (err) {
      setAutoEmitOnPayment(!enabled);
      toast.danger(err instanceof Error ? err.message : "Error al guardar");
    }
  };

  if (loading) {
    return (
      <div className="max-w-lg space-y-4">
        <div className="h-11 animate-pulse rounded-xl bg-surface-secondary" />
        <div className="h-24 animate-pulse rounded-xl bg-surface-secondary" />
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-3xl flex-col gap-6">
      <div className="rounded-xl border border-separator bg-surface-secondary/60 px-4 py-3 text-sm text-muted">
        Completa los mismos datos fiscales que en EdDeli (RUC, razón social,
        establecimiento y punto de emisión) y sube el certificado{" "}
        <span className="font-medium text-foreground">.p12</span> para firmar
        comprobantes SRI.
      </div>

      {status?.readyForInvoicing ? (
        <p className="rounded-xl border border-success/40 bg-success/10 px-4 py-2 text-sm text-success">
          Listo para facturar electrónicamente
        </p>
      ) : (
        <p className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-2 text-sm text-warning">
          Faltan datos fiscales o el certificado .p12 para emitir al SRI
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="sri-ruc">RUC</Label>
          <input
            id="sri-ruc"
            value={billing.ruc}
            onChange={(e) => setBilling((b) => ({ ...b, ruc: e.target.value }))}
            className="w-full rounded-xl border border-separator bg-field-background px-3.5 py-2.5 text-sm"
            placeholder="13 dígitos"
          />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="sri-legal">Razón social</Label>
          <input
            id="sri-legal"
            value={billing.legalName}
            onChange={(e) =>
              setBilling((b) => ({ ...b, legalName: e.target.value }))
            }
            className="w-full rounded-xl border border-separator bg-field-background px-3.5 py-2.5 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="sri-trade">Nombre comercial</Label>
          <input
            id="sri-trade"
            value={billing.tradeName}
            onChange={(e) =>
              setBilling((b) => ({ ...b, tradeName: e.target.value }))
            }
            className="w-full rounded-xl border border-separator bg-field-background px-3.5 py-2.5 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="sri-matrix">Dirección matriz</Label>
          <input
            id="sri-matrix"
            value={billing.matrixAddress}
            onChange={(e) =>
              setBilling((b) => ({ ...b, matrixAddress: e.target.value }))
            }
            className="w-full rounded-xl border border-separator bg-field-background px-3.5 py-2.5 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="sri-estab-addr">Dirección establecimiento</Label>
          <input
            id="sri-estab-addr"
            value={billing.establishmentAddress}
            onChange={(e) =>
              setBilling((b) => ({
                ...b,
                establishmentAddress: e.target.value,
              }))
            }
            className="w-full rounded-xl border border-separator bg-field-background px-3.5 py-2.5 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sri-estab">Establecimiento</Label>
          <input
            id="sri-estab"
            value={billing.establishmentCode}
            onChange={(e) =>
              setBilling((b) => ({ ...b, establishmentCode: e.target.value }))
            }
            className="w-full rounded-xl border border-separator bg-field-background px-3.5 py-2.5 text-sm"
            placeholder="001"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sri-pto">Punto de emisión</Label>
          <input
            id="sri-pto"
            value={billing.emissionPointCode}
            onChange={(e) =>
              setBilling((b) => ({ ...b, emissionPointCode: e.target.value }))
            }
            className="w-full rounded-xl border border-separator bg-field-background px-3.5 py-2.5 text-sm"
            placeholder="001"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sri-seq">Próximo secuencial</Label>
          <input
            id="sri-seq"
            type="number"
            min={1}
            value={billing.nextInvoiceSequential}
            onChange={(e) =>
              setBilling((b) => ({
                ...b,
                nextInvoiceSequential: Number(e.target.value) || 1,
              }))
            }
            className="w-full rounded-xl border border-separator bg-field-background px-3.5 py-2.5 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sri-phone">Teléfono fiscal</Label>
          <input
            id="sri-phone"
            value={billing.phone}
            onChange={(e) =>
              setBilling((b) => ({ ...b, phone: e.target.value }))
            }
            className="w-full rounded-xl border border-separator bg-field-background px-3.5 py-2.5 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="sri-email">Correo fiscal</Label>
          <input
            id="sri-email"
            value={billing.email}
            onChange={(e) =>
              setBilling((b) => ({ ...b, email: e.target.value }))
            }
            className="w-full rounded-xl border border-separator bg-field-background px-3.5 py-2.5 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sri-regime">Régimen</Label>
          <input
            id="sri-regime"
            value={billing.taxRegime}
            onChange={(e) =>
              setBilling((b) => ({ ...b, taxRegime: e.target.value }))
            }
            className="w-full rounded-xl border border-separator bg-field-background px-3.5 py-2.5 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sri-res">Resolución contrib. especial</Label>
          <input
            id="sri-res"
            value={billing.specialTaxpayerResolution}
            onChange={(e) =>
              setBilling((b) => ({
                ...b,
                specialTaxpayerResolution: e.target.value,
              }))
            }
            className="w-full rounded-xl border border-separator bg-field-background px-3.5 py-2.5 text-sm"
          />
        </div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            checked={billing.accountingRequired}
            onChange={(e) =>
              setBilling((b) => ({
                ...b,
                accountingRequired: e.target.checked,
              }))
            }
          />
          Obligado a llevar contabilidad
        </label>
      </div>

      <Button
        type="button"
        variant="secondary"
        isDisabled={pending}
        onPress={() => void saveBilling()}
      >
        Guardar datos fiscales
      </Button>

      {status?.hasCertificate ? (
        <div className="flex items-start gap-3 rounded-xl border border-separator bg-surface px-4 py-3">
          <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <Shield width={16} height={16} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              {status.certFileName ?? "Certificado cargado"}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              Ambiente:{" "}
              {status.environment === "produccion" ? "Producción" : "Pruebas"}
              {status.uploadedAt
                ? ` · ${new Date(status.uploadedAt).toLocaleString("es-EC")}`
                : ""}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            className="text-danger"
            isDisabled={pending}
            onPress={() => {
              void onRemove();
            }}
          >
            <TrashBin width={14} height={14} />
            Quitar
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted">
          Aún no hay certificado de firma electrónica configurado.
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sri-cert">Archivo .p12</Label>
        <input
          ref={fileRef}
          id="sri-cert"
          type="file"
          accept=".p12,.pfx,application/x-pkcs12,application/pkcs12"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            onPress={() => fileRef.current?.click()}
          >
            <File width={14} height={14} />
            Seleccionar certificado
          </Button>
          <span className="text-sm text-muted">
            {file ? file.name : "Ningún archivo seleccionado"}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sri-password">Contraseña del certificado</Label>
        <input
          id="sri-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          className="w-full rounded-xl border border-separator bg-field-background px-3.5 py-2.5 text-sm focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus"
          placeholder="Contraseña del .p12"
        />
      </div>

      <SelectField
        label="Ambiente SRI"
        selectedKey={environment}
        onSelectionChange={(key) => {
          const next = key === "produccion" ? "produccion" : "pruebas";
          setEnvironment(next);
          onEnvironmentChange?.(next);
        }}
        options={[
          { id: "pruebas", label: "Pruebas" },
          { id: "produccion", label: "Producción" },
        ]}
      />

      <label className="flex items-start gap-3 rounded-xl border border-separator bg-surface-secondary/40 px-4 py-3 text-sm">
        <input
          type="checkbox"
          checked={autoEmitOnPayment}
          onChange={(e) => void saveAutoEmit(e.target.checked)}
          className="mt-0.5 rounded border-separator"
        />
        <span>
          <span className="font-medium">Emitir factura al registrar pagos</span>
          <span className="mt-1 block text-xs text-muted">
            Crea y envía la factura electrónica automáticamente cuando se cobra un
            turno, si el certificado SRI está configurado.
          </span>
        </span>
      </label>

      <Button type="submit" variant="primary" isDisabled={pending}>
        {pending ? "Guardando..." : "Guardar certificado"}
      </Button>
    </form>
  );
}
