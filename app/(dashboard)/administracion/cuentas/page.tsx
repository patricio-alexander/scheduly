"use client";

import { apiUrl } from "@/shared/utils/api";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Button,
  Modal,
  useOverlayState,
  Input,
  Label,
  toast,
  Table,
  Pagination,
  SearchField,
  Chip,
} from "@heroui/react";
import { useAuth } from "@/src/features/auth";
import { useRoles } from "@/src/features/roles";
import { BranchPicker, useBranches } from "@/src/features/branches";
import { formatBranchLabel } from "@/shared/utils/branches";
import {
  ContentCard,
  EmptyState,
  PageHeader,
  TableSkeleton,
} from "@/shared/components/ui";
import { roleDisplayLabel } from "@/shared/utils/system-roles";
import Person from "@gravity-ui/icons/Person";
import Pencil from "@gravity-ui/icons/PencilToSquare";
import TrashBin from "@gravity-ui/icons/TrashBin";
import Plus from "@gravity-ui/icons/Plus";
import ArrowRotateLeft from "@gravity-ui/icons/ArrowRotateLeft";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
} from "@tanstack/react-table";

interface AccountRow {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
  roles: string[];
  isActive: boolean;
  branch: { id: number; name: string; code: string } | null;
}

const PAGE_SIZE = 10;

const roleColor: Record<string, "accent" | "default" | "warning"> = {
  Dueño: "accent",
  Administrador: "warning",
  Empleado: "default",
  owner: "accent",
  admin: "warning",
  employee: "default",
};

export default function AccountsPage() {
  const { user } = useAuth();
  const { roles, loading: rolesLoading } = useRoles();
  const { branches } = useBranches();
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AccountRow | null>(null);
  const [pending, setPending] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const modal = useOverlayState();

  const defaultRole =
    roles.find((r) => r.name === "Empleado" || r.name === "employee")?.name ??
    roles[0]?.name ??
    "Empleado";

  const [form, setForm] = useState({
    username: "",
    name: "",
    email: "",
    password: "",
    roles: ["Empleado"] as string[],
    branchId: null as number | null,
  });

  const mainBranchId = useMemo(
    () => branches.find((b) => b.isMain && b.isActive)?.id ?? null,
    [branches],
  );

  const defaultBranchId = useMemo(
    () => mainBranchId ?? branches.find((b) => b.isActive)?.id ?? null,
    [branches, mainBranchId],
  );

  const visibleAccounts = useMemo(() => {
    const list = Array.isArray(accounts) ? accounts : [];
    const others = list.filter((a) => a.id !== user?.id);
    if (!search) return others;
    const q = search.toLowerCase();
    return others.filter(
      (a) =>
        a.username.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        a.roles.some((r) => r.toLowerCase().includes(q)),
    );
  }, [accounts, search, user?.id]);

  const fetchAccounts = useCallback(async () => {
    try {
      const qs = showInactive ? "?includeInactive=1" : "";
      const res = await fetch(apiUrl(`/api/users${qs}`));
      const data: unknown = await res.json().catch(() => []);
      const rows = Array.isArray(data) ? (data as AccountRow[]) : [];
      setAccounts(
        rows.map((r) => ({
          ...r,
          roles: Array.isArray(r.roles) && r.roles.length ? r.roles : [r.role],
          isActive: r.isActive !== false,
        })),
      );
    } finally {
      setLoading(false);
    }
  }, [showInactive]);

  useEffect(() => {
    setLoading(true);
    fetchAccounts();
  }, [fetchAccounts]);

  const toggleRole = (roleName: string) => {
    setForm((f) => {
      const has = f.roles.includes(roleName);
      if (has) {
        const next = f.roles.filter((r) => r !== roleName);
        return { ...f, roles: next.length ? next : [defaultRole] };
      }
      return { ...f, roles: [...f.roles, roleName] };
    });
  };

  const openCreate = useCallback(() => {
    setEditing(null);
    setForm({
      username: "",
      name: "",
      email: "",
      password: "",
      roles: [defaultRole],
      branchId: defaultBranchId,
    });
    modal.open();
  }, [modal, defaultRole, defaultBranchId]);

  const openEdit = useCallback(
    (a: AccountRow) => {
      setEditing(a);
      const selected =
        a.roles?.length > 0
          ? a.roles.filter((r) => roles.some((x) => x.name === r))
          : [a.role];
      setForm({
        username: a.username,
        name: a.name,
        email: a.email,
        password: "",
        roles: selected.length ? selected : [defaultRole],
        branchId: a.branch?.id ?? mainBranchId ?? defaultBranchId,
      });
      modal.open();
    },
    [modal, roles, defaultRole, mainBranchId, defaultBranchId],
  );

  const closeModal = useCallback(() => {
    modal.close();
    setEditing(null);
  }, [modal]);

  const handleSubmit = async () => {
    if (!form.username || !form.name || !form.email) return;
    const password = form.password.trim();
    if (!editing && !password) {
      toast.danger("La contraseña es requerida");
      return;
    }
    if (password && password.length < 4) {
      toast.danger("La contraseña debe tener al menos 4 caracteres");
      return;
    }
    if (!form.roles.length) {
      toast.danger("Selecciona al menos un rol");
      return;
    }
    if (!form.branchId) {
      toast.danger("Selecciona una sucursal");
      return;
    }

    setPending(true);
    try {
      const payload: Record<string, unknown> = {
        username: form.username.trim(),
        name: form.name.trim(),
        email: form.email.trim(),
        roles: form.roles,
        role: form.roles[0],
        branchId: form.branchId,
      };
      if (password) payload.password = password;

      if (editing) {
        const res = await fetch(apiUrl(`/api/users/${editing.id}`), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const body = (await res.json().catch(() => null)) as {
          message?: string;
          passwordUpdated?: boolean;
        } | null;
        if (!res.ok) {
          toast.danger(body?.message ?? "Error al actualizar la cuenta");
          return;
        }
        toast.success(
          body?.passwordUpdated
            ? "Cuenta y contraseña actualizadas"
            : "Cuenta actualizada",
        );
      } else {
        const res = await fetch(apiUrl("/api/users"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, password }),
        });
        const body = (await res.json().catch(() => null)) as {
          message?: string;
        } | null;
        if (!res.ok) {
          toast.danger(body?.message ?? "Error al crear la cuenta");
          return;
        }
        toast.success("Cuenta creada");
      }
      closeModal();
      fetchAccounts();
    } catch {
      toast.danger("Error al guardar la cuenta");
    } finally {
      setPending(false);
    }
  };

  const handleDeactivate = async (id: number) => {
    if (!confirm("¿Desactivar esta cuenta? No podrá iniciar sesión.")) return;
    try {
      const res = await fetch(apiUrl(`/api/users/${id}`), { method: "DELETE" });
      const body = (await res.json().catch(() => null)) as {
        message?: string;
      } | null;
      if (!res.ok) {
        toast.danger(body?.message ?? "No se pudo desactivar");
        return;
      }
      toast.success("Cuenta desactivada");
      fetchAccounts();
    } catch (e) {
      toast.danger(e instanceof Error ? e.message : "Error al desactivar");
    }
  };

  const handleReactivate = async (a: AccountRow) => {
    try {
      const res = await fetch(apiUrl(`/api/users/${a.id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: a.username,
          name: a.name,
          email: a.email,
          roles: a.roles?.length ? a.roles : [a.role],
          role: a.role,
          branchId: a.branch?.id ?? defaultBranchId,
          isActive: true,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          message?: string;
        } | null;
        toast.danger(body?.message ?? "No se pudo reactivar");
        return;
      }
      toast.success("Cuenta reactivada");
      fetchAccounts();
    } catch {
      toast.danger("Error al reactivar");
    }
  };

  const columns = useMemo(
    () => [
      { accessorKey: "username" as const, header: "Usuario" },
      { accessorKey: "name" as const, header: "Persona" },
      { accessorKey: "email" as const, header: "Correo" },
    ],
    [],
  );

  const table = useReactTable({
    data: visibleAccounts,
    columns,
    pageCount: Math.ceil(visibleAccounts.length / PAGE_SIZE),
    state: { pagination: { pageIndex: page - 1, pageSize: PAGE_SIZE } },
    onPaginationChange: (updater) => {
      const next =
        typeof updater === "function"
          ? updater({ pageIndex: page - 1, pageSize: PAGE_SIZE })
          : updater;
      setPage(next.pageIndex + 1);
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (!user || user.role !== "owner") return null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={<Person width={24} height={24} />}
        title="Cuentas"
        description="Una persona = una cuenta. Asigna roles y el local que administra o donde trabaja. La Dueña activa/desactiva y vincula."
        action={
          <Button variant="primary" onPress={openCreate}>
            <Plus width={16} height={16} />
            Nueva cuenta
          </Button>
        }
      />

      {loading ? (
        <ContentCard>
          <TableSkeleton />
        </ContentCard>
      ) : visibleAccounts.length === 0 && !search ? (
        <ContentCard>
          <EmptyState
            icon={<Person width={40} height={40} />}
            title="No hay otras cuentas"
            description="Crea cuentas para el equipo de Peluquería y Spa."
            actionLabel="Nueva cuenta"
            onAction={openCreate}
          />
        </ContentCard>
      ) : (
        <ContentCard>
          <div className="flex flex-col gap-4 p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <SearchField value={search} onChange={setSearch}>
                <Label>Buscar cuenta</Label>
                <SearchField.Group>
                  <SearchField.SearchIcon />
                  <SearchField.Input
                    className="w-full sm:w-[320px]"
                    placeholder="Usuario, persona, correo o rol..."
                  />
                  <SearchField.ClearButton />
                </SearchField.Group>
              </SearchField>
              <label className="flex items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                />
                Mostrar inactivas
              </label>
            </div>
            <Table>
              <Table.ScrollContainer>
                <Table.Content aria-label="Cuentas" className="min-w-[560px]">
                  <Table.Header>
                    <Table.Column isRowHeader>Usuario</Table.Column>
                    <Table.Column>Persona</Table.Column>
                    <Table.Column>Correo</Table.Column>
                    <Table.Column>Roles</Table.Column>
                    <Table.Column>Estado</Table.Column>
                    <Table.Column>Sucursal</Table.Column>
                    <Table.Column>Acciones</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {table.getRowModel().rows.length === 0 ? (
                      <Table.Row>
                        <Table.Cell colSpan={7}>
                          <div className="py-8 text-center text-sm text-muted">
                            No se encontraron cuentas con &quot;{search}&quot;
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    ) : (
                      table.getRowModel().rows.map((row) => {
                        const a = row.original;
                        return (
                          <Table.Row key={a.id}>
                            <Table.Cell>
                              <span className="font-medium">{a.username}</span>
                            </Table.Cell>
                            <Table.Cell>{a.name}</Table.Cell>
                            <Table.Cell className="text-muted">
                              {a.email}
                            </Table.Cell>
                            <Table.Cell>
                              <div className="flex flex-wrap gap-1">
                                {(a.roles?.length ? a.roles : [a.role]).map(
                                  (r) => (
                                    <Chip
                                      key={r}
                                      color={roleColor[r] ?? "default"}
                                      variant="soft"
                                      size="sm"
                                    >
                                      {roleDisplayLabel(r)}
                                    </Chip>
                                  ),
                                )}
                              </div>
                            </Table.Cell>
                            <Table.Cell>
                              <Chip
                                color={a.isActive ? "accent" : "default"}
                                variant="soft"
                                size="sm"
                              >
                                {a.isActive ? "Activa" : "Inactiva"}
                              </Chip>
                            </Table.Cell>
                            <Table.Cell className="text-muted">
                              {a.branch
                                ? formatBranchLabel(
                                    a.branch.name,
                                    branches.find((b) => b.id === a.branch?.id)
                                      ?.isMain,
                                  )
                                : "—"}
                            </Table.Cell>
                            <Table.Cell>
                              <div className="flex gap-1">
                                <Button
                                  isIconOnly
                                  size="sm"
                                  variant="ghost"
                                  onPress={() => openEdit(a)}
                                >
                                  <Pencil width={16} height={16} />
                                </Button>
                                {a.isActive ? (
                                  <Button
                                    isIconOnly
                                    size="sm"
                                    variant="danger"
                                    onPress={() => handleDeactivate(a.id)}
                                  >
                                    <TrashBin width={16} height={16} />
                                  </Button>
                                ) : (
                                  <Button
                                    isIconOnly
                                    size="sm"
                                    variant="secondary"
                                    onPress={() => handleReactivate(a)}
                                  >
                                    <ArrowRotateLeft width={16} height={16} />
                                  </Button>
                                )}
                              </div>
                            </Table.Cell>
                          </Table.Row>
                        );
                      })
                    )}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
            {visibleAccounts.length > PAGE_SIZE && (
              <Table.Footer>
                <Pagination size="sm">
                  <Pagination.Summary>
                    {table.getState().pagination.pageIndex * PAGE_SIZE + 1} a{" "}
                    {Math.min(
                      (table.getState().pagination.pageIndex + 1) * PAGE_SIZE,
                      visibleAccounts.length,
                    )}{" "}
                    de {visibleAccounts.length} resultados
                  </Pagination.Summary>
                  <Pagination.Content>
                    <Pagination.Item>
                      <Pagination.Previous
                        isDisabled={!table.getCanPreviousPage()}
                        onPress={() => table.previousPage()}
                      >
                        <Pagination.PreviousIcon />
                      </Pagination.Previous>
                    </Pagination.Item>
                    {Array.from(
                      { length: table.getPageCount() },
                      (_, i) => i + 1,
                    ).map((p) => (
                      <Pagination.Item key={p}>
                        <Pagination.Link
                          isActive={p === page}
                          onPress={() => setPage(p)}
                        >
                          {p}
                        </Pagination.Link>
                      </Pagination.Item>
                    ))}
                    <Pagination.Item>
                      <Pagination.Next
                        isDisabled={!table.getCanNextPage()}
                        onPress={() => table.nextPage()}
                      >
                        <Pagination.NextIcon />
                      </Pagination.Next>
                    </Pagination.Item>
                  </Pagination.Content>
                </Pagination>
              </Table.Footer>
            )}
          </div>
        </ContentCard>
      )}

      <Modal state={modal}>
        <Modal.Backdrop>
          <Modal.Container placement="center">
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Icon>
                  <Person width={20} height={20} />
                </Modal.Icon>
                <Modal.Heading>
                  {editing ? "Editar cuenta" : "Nueva cuenta"}
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <form
                  className="flex flex-col gap-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmit();
                  }}
                  id="account-form"
                >
                  <p className="text-xs text-muted">
                    Cada persona tiene una sola cuenta. Puedes marcar varios
                    roles. El local indica qué sucursal administra
                    (Administrador) o dónde trabaja (Empleado).
                  </p>
                  <div className="flex flex-col gap-1">
                    <Label>Nombre de usuario</Label>
                    <Input
                      placeholder="ej: estilista_maria"
                      value={form.username}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, username: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label>Nombre de la persona</Label>
                    <Input
                      placeholder="María García"
                      value={form.name}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, name: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label>Correo</Label>
                    <Input
                      placeholder="maria@andreaguerrero.ec"
                      value={form.email}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, email: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label>
                      {editing
                        ? "Nueva contraseña (vacío = mantener)"
                        : "Contraseña"}
                    </Label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      placeholder={
                        editing ? "Nueva contraseña" : "••••••••"
                      }
                      value={form.password}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, password: e.target.value }))
                      }
                      className="rounded-xl border border-separator bg-field-background px-3 py-2 text-field-foreground placeholder:text-field-placeholder focus:outline-none focus:ring-2 focus:ring-focus"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label>Roles (multi-selección)</Label>
                    {rolesLoading ? (
                      <p className="text-sm text-muted">Cargando roles...</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {roles.map((r) => {
                          const selected = form.roles.includes(r.name);
                          return (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => toggleRole(r.name)}
                              className={`px-3 py-1.5 rounded-xl text-sm border transition-colors ${
                                selected
                                  ? "bg-accent text-accent-foreground border-accent"
                                  : "bg-field-background text-field-foreground border-separator"
                              }`}
                            >
                              {roleDisplayLabel(r.name)}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label>Local / sucursal asignada</Label>
                    <BranchPicker
                      branches={branches}
                      value={form.branchId}
                      onChange={(branchId) =>
                        setForm((f) => ({ ...f, branchId }))
                      }
                      placeholder="Seleccionar local..."
                    />
                    <p className="text-xs text-muted">
                      Administrador = maneja ese local. Empleado = atiende ahí.
                      La Dueña controla todos los locales.
                    </p>
                  </div>
                </form>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onPress={closeModal}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isDisabled={pending}
                  form="account-form"
                >
                  {pending
                    ? "Guardando..."
                    : editing
                      ? "Actualizar"
                      : "Crear cuenta"}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
