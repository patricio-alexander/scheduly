"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Label, toast } from "@heroui/react";
import Buildings from "@gravity-ui/icons/House";
import MapPin from "@gravity-ui/icons/MapPin";
import Picture from "@gravity-ui/icons/Picture";
import TrashBin from "@gravity-ui/icons/TrashBin";
import { apiUrl } from "@/shared/utils/api";
import {
  ACCENT_PRESETS,
  DEFAULT_THEME_COLORS,
  broadcastThemeColorsLocally,
  applyThemeColors,
  normalizeHex,
  normalizeThemeColors,
  type ThemeColors,
} from "@/shared/utils/business-profile";
import type { BusinessSettings } from "../types";

function logoSrc(logoPath: string | null) {
  if (!logoPath) return null;
  return apiUrl(logoPath);
}

function ColorField({
  id,
  label,
  value,
  onChange,
  presets,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (hex: string) => void;
  presets?: readonly { label: string; value: string }[];
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-3">
        <input
          id={id}
          type="color"
          value={value}
          onChange={(e) => onChange(normalizeHex(e.target.value, value))}
          className="h-11 w-14 cursor-pointer rounded-xl border border-separator bg-field-background p-1"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const next = e.target.value.trim();
            if (/^#[0-9a-fA-F]{0,6}$/.test(next) || next === "") {
              onChange(next.toUpperCase() || value);
            }
          }}
          onBlur={() => onChange(normalizeHex(value, DEFAULT_THEME_COLORS.accentColor))}
          className="w-28 rounded-xl border border-separator bg-field-background px-3 py-2.5 font-mono text-sm uppercase tracking-wide focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus"
          spellCheck={false}
          maxLength={7}
        />
        <div
          className="h-11 flex-1 rounded-xl border border-separator"
          style={{ background: value }}
          aria-hidden
        />
      </div>
      {presets ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {presets.map((preset) => (
            <button
              key={preset.value}
              type="button"
              title={preset.label}
              onClick={() => onChange(preset.value)}
              className={`h-8 w-8 rounded-lg border transition-transform hover:scale-105 ${
                value.toUpperCase() === preset.value.toUpperCase()
                  ? "border-foreground ring-2 ring-focus"
                  : "border-separator"
              }`}
              style={{ background: preset.value }}
              aria-label={preset.label}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function BusinessSettingsForm() {
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [businessName, setBusinessName] = useState("Scheduly");
  const [address, setAddress] = useState("");
  const [ruc, setRuc] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [obligationAccounting, setObligationAccounting] = useState(true);
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [colors, setColors] = useState<ThemeColors>(DEFAULT_THEME_COLORS);
  const fileRef = useRef<HTMLInputElement>(null);
  const persistedColorsRef = useRef<ThemeColors>(DEFAULT_THEME_COLORS);
  const colorsReadyRef = useRef(false);

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
          setBusinessName(json.businessName || "Scheduly");
          setAddress(json.address || "");
          setRuc(json.ruc || "");
          setTradeName(json.tradeName || "");
          setObligationAccounting(json.obligationAccounting ?? true);
          setLogoPath(json.logoPath);
          const loaded = normalizeThemeColors(json);
          setColors(loaded);
          persistedColorsRef.current = loaded;
          colorsReadyRef.current = true;
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

  // Vista previa en vivo de los colores (pestaña actual)
  useEffect(() => {
    if (loading) return;
    applyThemeColors(colors);
  }, [colors, loading]);

  // Propaga colores a todas las sucursales mientras se editan (debounced)
  useEffect(() => {
    if (loading || !colorsReadyRef.current) return;

    const unchanged = (
      Object.keys(colors) as Array<keyof ThemeColors>
    ).every((key) => colors[key] === persistedColorsRef.current[key]);
    if (unchanged) return;

    const timer = setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(apiUrl("/api/settings/theme"), {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(colors),
          });
          if (!res.ok) return;
          const json = (await res.json().catch(() => null)) as
            | Partial<ThemeColors>
            | null;
          if (!json) return;
          const saved = normalizeThemeColors(json);
          persistedColorsRef.current = saved;
        } catch {
          // ignore; el usuario puede guardar manualmente
        }
      })();
    }, 500);

    return () => clearTimeout(timer);
  }, [colors, loading]);

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

  const setColor =
    (key: keyof ThemeColors) =>
    (hex: string) => {
      setColors((prev) => ({
        ...prev,
        [key]: normalizeHex(hex, prev[key]),
      }));
    };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      form.set("accentColor", colors.accentColor);
      form.set("successColor", colors.successColor);
      form.set("warningColor", colors.warningColor);
      form.set("dangerColor", colors.dangerColor);
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
      const nextColors = normalizeThemeColors(json);
      setColors(nextColors);
      persistedColorsRef.current = nextColors;
      broadcastThemeColorsLocally(nextColors);
      setLogoFile(null);
      setRemoveLogo(false);
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

      <div className="border-t border-separator pt-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
          Colores del sistema
        </h3>
        <div className="flex flex-col gap-5">
          <ColorField
            id="accentColor"
            label="Color de acento"
            value={colors.accentColor}
            onChange={setColor("accentColor")}
            presets={ACCENT_PRESETS}
          />
          <div className="grid gap-5 sm:grid-cols-3">
            <ColorField
              id="successColor"
              label="Éxito"
              value={colors.successColor}
              onChange={setColor("successColor")}
            />
            <ColorField
              id="warningColor"
              label="Advertencia"
              value={colors.warningColor}
              onChange={setColor("warningColor")}
            />
            <ColorField
              id="dangerColor"
              label="Peligro"
              value={colors.dangerColor}
              onChange={setColor("dangerColor")}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-xl bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground">
              Acento
            </span>
            <span className="rounded-xl bg-success px-3 py-1.5 text-xs font-semibold text-success-foreground">
              Éxito
            </span>
            <span className="rounded-xl bg-warning px-3 py-1.5 text-xs font-semibold text-warning-foreground">
              Advertencia
            </span>
            <span className="rounded-xl bg-danger px-3 py-1.5 text-xs font-semibold text-danger-foreground">
              Peligro
            </span>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="self-start"
            onPress={() => setColors(DEFAULT_THEME_COLORS)}
          >
            Restaurar colores por defecto
          </Button>
        </div>
      </div>

      <Button type="submit" variant="primary" isDisabled={pending}>
        {pending ? "Guardando..." : "Guardar cambios"}
      </Button>
    </form>
  );
}
