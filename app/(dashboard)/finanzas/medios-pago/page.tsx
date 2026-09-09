"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, toast } from "@heroui/react";
import Plus from "@gravity-ui/icons/Plus";
import { PageHeader } from "@/shared/components/ui";
import { apiUrl } from "@/shared/utils/api";
import {
  paymentMediumKindLabel,
  type PaymentMediumKind,
} from "@/shared/utils/payment-media";
import { useAuth } from "@/src/features/auth";
import { isOwnerRole } from "@/shared/utils/roles";

type Medium = {
  id: number;
  name: string;
  code: string | null;
  kind: string;
  position: number;
  isActive: boolean;
};

export default function PaymentMediaPage() {
  const { user } = useAuth();
  const isOwner = isOwnerRole(user?.role);
  const [media, setMedia] = useState<Medium[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<PaymentMediumKind>("transfer");
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/finance/payment-media"), {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) throw new Error("fail");
      const json = (await res.json()) as { media?: Medium[] };
      setMedia(Array.isArray(json.media) ? json.media : []);
    } catch {
      toast.danger("No se pudieron cargar los medios de pago");
      setMedia([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    if (!name.trim()) {
      toast.danger("Indicá un nombre");
      return;
    }
    setPending(true);
    try {
      const res = await fetch(apiUrl("/api/finance/payment-media"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), kind }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(j.message || "Error");
      }
      setName("");
      toast.success("Medio agregado");
      await load();
    } catch (e) {
      toast.danger(e instanceof Error ? e.message : "Error al crear");
    } finally {
      setPending(false);
    }
  };

  const toggleActive = async (m: Medium) => {
    setPending(true);
    try {
      const res = await fetch(apiUrl(`/api/finance/payment-media/${m.id}`), {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !m.isActive }),
      });
      if (!res.ok) throw new Error("fail");
      toast.success(m.isActive ? "Medio deshabilitado" : "Medio habilitado");
      await load();
    } catch {
      toast.danger("No se pudo actualizar");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Medios de pago"
        description="Bancos y formas de cobro del cuadre diario. No se eliminan: se deshabilitan."
        icon={<Plus className="size-5" />}
      />

      {isOwner ? (
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-separator bg-surface p-4">
          <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-sm">
            <span className="text-muted">Nombre</span>
            <input
              className="rounded-lg border border-separator bg-field-background px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Banco Pichincha"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Tipo</span>
            <select
              className="rounded-lg border border-separator bg-field-background px-3 py-2"
              value={kind}
              onChange={(e) => setKind(e.target.value as PaymentMediumKind)}
            >
              {Object.entries(paymentMediumKindLabel).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <Button isDisabled={pending} onPress={() => void create()}>
            Añadir
          </Button>
        </div>
      ) : null}

      {loading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-surface-secondary" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-separator">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-secondary text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Nombre</th>
                <th className="px-3 py-2 font-medium">Tipo</th>
                <th className="px-3 py-2 font-medium">Estado</th>
                {isOwner ? (
                  <th className="px-3 py-2 font-medium">Acción</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {media.map((m) => (
                <tr key={m.id} className="border-t border-separator">
                  <td className="px-3 py-2">{m.name}</td>
                  <td className="px-3 py-2">
                    {paymentMediumKindLabel[m.kind as PaymentMediumKind] ??
                      m.kind}
                  </td>
                  <td className="px-3 py-2">
                    {m.isActive ? "Activo" : "Deshabilitado"}
                  </td>
                  {isOwner ? (
                    <td className="px-3 py-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        isDisabled={pending}
                        onPress={() => void toggleActive(m)}
                      >
                        {m.isActive ? "Deshabilitar" : "Habilitar"}
                      </Button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
