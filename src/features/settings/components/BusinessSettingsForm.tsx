"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Label, toast } from "@heroui/react";
import Buildings from "@gravity-ui/icons/House";
import MapPin from "@gravity-ui/icons/MapPin";
import Picture from "@gravity-ui/icons/Picture";
import TrashBin from "@gravity-ui/icons/TrashBin";
import { apiUrl } from "@/shared/utils/api";
import { DEFAULT_BUSINESS_NAME } from "@/shared/utils/business-profile";
import type { BusinessSettings } from "../types";

type FormSnapshot = {
  businessName: string;
  address: string;
  ruc: string;
  tradeName: string;
  obligationAccounting: boolean;
  logoPath: string | null;
};

function logoSrc(logoPath: string | null) {
  if (!logoPath) return null;
  return apiUrl(logoPath);
}

export function BusinessSettingsForm() {
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [businessName, setBusinessName] = useState(DEFAULT_BUSINESS_NAME);
  const [address, setAddress] = useState("");
  const [ruc, setRuc] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [obligationAccounting, setObligationAccounting] = useState(true);
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [baseline, setBaseline] = useState<FormSnapshot | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const dirty = useMemo(() => {
    if (!baseline || loading) return false;
    if (logoFile || removeLogo) return true;
    if (businessName !== baseline.businessName) return true;
    if (address !== baseline.address) return true;
    if (ruc !== baseline.ruc) return true;
    if (tradeName !== baseline.tradeName) return true;
    if (obligationAccounting !== baseline.obligationAccounting) return true;
    if (logoPath !== baseline.logoPath) return true;
    return false;
  }, [
    baseline,
    loading,
    logoFile,
    removeLogo,
    businessName,
    address,
    ruc,
    tradeName,
    obligationAccounting,
    logoPath,
  ]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(apiUrl("/api/settings"), { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as
          | BusinessSettings
          | null;
        if (!cancelled && res.ok && json) {
          const name = json.businessName || DEFAULT_BUSINESS_NAME;
          const addr = json.address || "";
          const nextRuc = json.ruc || "";
          const nextTrade = json.tradeName || "";
          const nextOblig = json.obligationAccounting ?? true;
          const nextLogo = json.logoPath;
          setBusinessName(name);
          setAddress(addr);
          setRuc(nextRuc);
          setTradeName(nextTrade);
          setObligationAccounting(nextOblig);
          setLogoPath(nextLogo);
          setBaseline({
            businessName: name,
            address: addr,
            ruc: nextRuc,
            tradeName: nextTrade,
            obligationAccounting: nextOblig,
            logoPath: nextLogo,
          });
        }
      } catch {
        if (!cancelled) toast.danger("No se pudo cargar la configuración");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview(null);
      return;
    }
    const url = URL.createObjectURL(logoFile);
    setLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  const displayedLogo = removeLogo
    ? null
    : logoPreview || logoSrc(logoPath);

  const onPickLogo = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.danger("Selecciona una imagen");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.danger("El logo no puede superar 2 MB");
      return;
    }
    setLogoFile(file);
    setRemoveLogo(false);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dirty || pending) return;
    if (!businessName.trim()) {
      toast.danger("El nombre del negocio es obligatorio");
      return;
    }
    setPending(true);
    try {
      const form = new FormData();
      form.set("businessName", businessName.trim());
      form.set("address", address.trim());
      form.set("ruc", ruc.trim());
      form.set("tradeName", tradeName.trim());
      form.set("obligationAccounting", obligationAccounting ? "1" : "0");
      if (removeLogo) form.set("removeLogo", "1");
      if (logoFile) form.set("logo", logoFile);

      const res = await fetch(apiUrl("/api/settings"), {
        method: "PUT",
        body: form,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          typeof json?.message === "string"
            ? json.message
            : "No se pudo guardar",
        );
      }
      setBusinessName(json.businessName);
      setAddress(json.address ?? "");
      setRuc(json.ruc ?? "");
      setTradeName(json.tradeName ?? "");
      setObligationAccounting(json.obligationAccounting ?? true);
      setLogoPath(json.logoPath);
      setLogoFile(null);
      setRemoveLogo(false);
      setBaseline({
        businessName: json.businessName,
        address: json.address ?? "",
        ruc: json.ruc ?? "",
        tradeName: json.tradeName ?? "",
        obligationAccounting: json.obligationAccounting ?? true,
        logoPath: json.logoPath,
      });
      toast.success("Configuración guardada");
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setPending(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-lg space-y-4">
        <div className="h-11 animate-pulse rounded-xl bg-surface-secondary" />
        <div className="h-24 animate-pulse rounded-xl bg-surface-secondary" />
        <div className="h-28 animate-pulse rounded-xl bg-surface-secondary" />
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-lg flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="businessName">Nombre del negocio</Label>
        <div className="relative">
          <Buildings
            width={16}
            height={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            id="businessName"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="w-full rounded-xl border border-separator bg-field-background py-2.5 pl-10 pr-3 text-sm text-field-foreground placeholder:text-field-placeholder focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus"
            placeholder="Ej. Barbería Norte"
            required
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="address">Dirección</Label>
        <div className="relative">
          <MapPin
            width={16}
            height={16}
            className="pointer-events-none absolute left-3 top-3 text-muted"
          />
          <textarea
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={3}
            className="min-h-[88px] w-full resize-y rounded-xl border border-separator bg-field-background py-2.5 pl-10 pr-3 text-sm text-field-foreground placeholder:text-field-placeholder focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus"
            placeholder="Calle, número, comuna, ciudad"
          />
        </div>
      </div>

      <div className="border-t border-separator pt-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
          Datos tributarios (SRI)
        </h3>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ruc">RUC del negocio</Label>
            <input
              id="ruc"
              value={ruc}
              onChange={(e) => setRuc(e.target.value.replace(/\D/g, "").slice(0, 13))}
              className="w-full rounded-xl border border-separator bg-field-background px-3.5 py-2.5 font-mono text-sm focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus"
              placeholder="1791234567001"
              maxLength={13}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tradeName">Nombre comercial</Label>
            <input
              id="tradeName"
              value={tradeName}
              onChange={(e) => setTradeName(e.target.value)}
              className="w-full rounded-xl border border-separator bg-field-background px-3.5 py-2.5 text-sm focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus"
              placeholder="Opcional · aparece en la factura"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={obligationAccounting}
              onChange={(e) => setObligationAccounting(e.target.checked)}
              className="rounded border-separator"
            />
            Obligado a llevar contabilidad
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Logo</Label>
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-separator bg-surface-secondary">
            {displayedLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={displayedLogo}
                alt="Logo del negocio"
                className="h-full w-full object-contain p-1.5"
              />
            ) : (
              <Picture width={22} height={22} className="text-muted" />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => onPickLogo(e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              variant="secondary"
              onPress={() => fileRef.current?.click()}
            >
              Subir imagen
            </Button>
            {(logoPath || logoFile) && !removeLogo ? (
              <Button
                type="button"
                variant="ghost"
                className="justify-start text-danger"
                onPress={() => {
                  setLogoFile(null);
                  setRemoveLogo(true);
                  if (fileRef.current) fileRef.current.value = "";
                }}
              >
                <TrashBin width={14} height={14} />
                Quitar logo
              </Button>
            ) : null}
            <p className="text-xs text-muted">PNG, JPG, WEBP o SVG · máx. 2 MB</p>
          </div>
        </div>
      </div>

      <div className="sticky bottom-4 z-10 flex justify-end">
        <Button
          type="submit"
          variant="primary"
          isDisabled={!dirty || pending}
        >
          {pending ? "Guardando…" : "Guardar configuración"}
        </Button>
      </div>
    </form>
  );
}
