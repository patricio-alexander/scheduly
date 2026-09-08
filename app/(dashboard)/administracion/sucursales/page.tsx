"use client";

import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "@/shared/utils/api";
import { useAuth } from "@/src/features/auth";
import {
  Button,
  Input,
  Label,
  Modal,
  toast,
  useOverlayState,
  Chip,
} from "@heroui/react";
import House from "@gravity-ui/icons/House";
import Plus from "@gravity-ui/icons/Plus";
import {
  ContentCard,
  EmptyState,
  PageHeader,
} from "@/shared/components/ui";
import { roleDisplayLabel } from "@/shared/utils/system-roles";
import { formatBranchLabel } from "@/shared/utils/branches";

type TeamMember = {
  id: number;
  username: string;
  name: string;
  role: string;
  isActive: boolean;
  isPrimary: boolean;
};

type BranchRow = {
  id: number;
  name: string;
  code: string;
  address: string;
  phone: string | null;
  isMain: boolean;
  locationKind?: string | null;
  teamCount: number;
  team?: TeamMember[];
};

export default function BranchesPage() {
  const { user } = useAuth();
  const isOwner = user?.role === "owner";
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const modal = useOverlayState();
  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
  });

  const fetchBranches = useCallback(async () => {
    setLoading(true);
    try {
      const qs = isOwner ? "?withTeam=1" : "";
      const res = await fetch(apiUrl(`/api/branches${qs}`), {
        credentials: "include",
      });
      const data: unknown = await res.json().catch(() => []);
      setBranches(Array.isArray(data) ? (data as BranchRow[]) : []);
    } finally {
      setLoading(false);
    }
  }, [isOwner]);

  useEffect(() => {
    void fetchBranches();
  }, [fetchBranches]);

  const openCreate = () => {
    setForm({ name: "", address: "", phone: "" });
    modal.open();
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.danger("El nombre del local es requerido");
      return;
    }
    setPending(true);
    try {
      const res = await fetch(apiUrl("/api/branches"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          address: form.address.trim() || "Loja, Ecuador",
          phone: form.phone.trim() || undefined,
        }),
      });
      const body = (await res.json().catch(() => null)) as {
        message?: string;
      } | null;
      if (!res.ok) {
        toast.danger(body?.message ?? "No se pudo crear el local");
        return;
      }
      toast.success("Local creado");
      modal.close();
      fetchBranches();
    } catch {
      toast.danger("Error al crear el local");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader
        icon={<House width={24} height={24} />}
        title="Sucursales"
        description={
          isOwner
            ? "Crea locales y revisa qué administradores/empleados están vinculados a cada uno. La asignación se hace en Cuentas."
            : "Tu local asignado. Solo ves la operación de esta sucursal."
        }
        action={
          isOwner ? (
            <Button variant="primary" onPress={openCreate}>
              <Plus width={16} height={16} />
              Nuevo local
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <div className="h-32 animate-pulse rounded-2xl bg-surface-secondary" />
      ) : branches.length === 0 ? (
        <ContentCard>
          <EmptyState
            icon={<House width={40} height={40} />}
            title={isOwner ? "Sin locales" : "Sin local asignado"}
            description={
              isOwner
                ? "Crea el primer local del negocio."
                : "Pide a la Dueña que te vincule a una sucursal en Cuentas."
            }
            actionLabel={isOwner ? "Nuevo local" : undefined}
            onAction={isOwner ? openCreate : undefined}
          />
        </ContentCard>
      ) : (
        <ul className="grid gap-4">
          {branches.map((b) => (
            <li
              key={b.id}
              className="rounded-2xl border border-separator bg-surface p-5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h2 className="font-semibold">
                    {formatBranchLabel(b.name, b.isMain, b.locationKind)}
                  </h2>
                  {b.isMain ? (
                    <Chip color="accent" variant="soft" size="sm">
                      Casa matriz
                    </Chip>
                  ) : null}
                </div>
                <span className="shrink-0 rounded-full bg-surface-secondary px-2 py-0.5 text-[10px] font-bold uppercase">
                  {b.code}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted">{b.address}</p>
              {b.phone ? (
                <p className="mt-1 text-sm text-muted">{b.phone}</p>
              ) : null}
              <p className="mt-3 text-sm">
                Equipo vinculado:{" "}
                <span className="font-medium">{b.teamCount ?? 0}</span>
              </p>

              {isOwner && b.team && b.team.length > 0 ? (
                <ul className="mt-3 flex flex-col gap-2 border-t border-separator pt-3">
                  {b.team.map((m) => (
                    <li
                      key={m.id}
                      className="flex flex-wrap items-center justify-between gap-2 text-sm"
                    >
                      <span>
                        <span className="font-medium">{m.name}</span>
                        <span className="text-muted"> · @{m.username}</span>
                      </span>
                      <div className="flex items-center gap-1">
                        <Chip
                          color={
                            m.role === "Administrador" || m.role === "admin"
                              ? "warning"
                              : "default"
                          }
                          variant="soft"
                          size="sm"
                        >
                          {roleDisplayLabel(m.role)}
                        </Chip>
                        <Chip
                          color={m.isActive ? "accent" : "default"}
                          variant="soft"
                          size="sm"
                        >
                          {m.isActive ? "Activa" : "Inactiva"}
                        </Chip>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}

              {isOwner ? (
                <p className="mt-3 text-xs text-muted">
                  Para asignar o quitar gente de este local: Administración →
                  Cuentas → editar → elegir sucursal.
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {isOwner ? (
        <Modal state={modal}>
          <Modal.Backdrop>
            <Modal.Container placement="center">
              <Modal.Dialog>
                <Modal.CloseTrigger />
                <Modal.Header>
                  <Modal.Icon>
                    <House width={20} height={20} />
                  </Modal.Icon>
                  <Modal.Heading>Nuevo local</Modal.Heading>
                </Modal.Header>
                <Modal.Body>
                  <form
                    id="branch-form"
                    className="flex flex-col gap-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void handleCreate();
                    }}
                  >
                    <div className="flex flex-col gap-1">
                      <Label>Nombre</Label>
                      <Input
                        placeholder="Andrea Guerrero · Nuevo local"
                        value={form.name}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, name: e.target.value }))
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label>Dirección</Label>
                      <Input
                        placeholder="Calle y referencia, Loja"
                        value={form.address}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, address: e.target.value }))
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label>Teléfono</Label>
                      <Input
                        placeholder="099..."
                        value={form.phone}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, phone: e.target.value }))
                        }
                      />
                    </div>
                  </form>
                </Modal.Body>
                <Modal.Footer>
                  <Button variant="secondary" onPress={() => modal.close()}>
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    form="branch-form"
                    variant="primary"
                    isDisabled={pending}
                  >
                    {pending ? "Creando..." : "Crear local"}
                  </Button>
                </Modal.Footer>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      ) : null}
    </div>
  );
}
