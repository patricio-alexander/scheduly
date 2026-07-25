"use client";

import { apiUrl } from "@/shared/utils/api";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Button, Modal, useOverlayState, Input, Label, toast, Table, Pagination, SearchField, Chip } from "@heroui/react";
import { useAuth } from "@/src/features/auth";
import { useRoles } from "@/src/features/roles";
import { ContentCard, EmptyState, PageHeader, TableSkeleton } from "@/shared/components/ui";
import { roleDisplayLabel } from "@/shared/utils/system-roles";
import Shield from "@gravity-ui/icons/Shield";
import Pencil from "@gravity-ui/icons/PencilToSquare";
import TrashBin from "@gravity-ui/icons/TrashBin";
import Plus from "@gravity-ui/icons/Plus";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
} from "@tanstack/react-table";

interface UserData {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
}

const PAGE_SIZE = 10;

const roleColor: Record<string, "accent" | "default"> = {
  admin: "accent",
  employee: "default",
  user: "default",
};

export default function UsersPage() {
  const { user } = useAuth();
  const { roles, loading: rolesLoading } = useRoles();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<UserData | null>(null);
  const [pending, setPending] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const modal = useOverlayState();

  const defaultRole = roles.find((r) => r.name === "employee")?.name ?? roles[0]?.name ?? "employee";

  const [form, setForm] = useState({
    username: "",
    name: "",
    email: "",
    password: "",
    role: "employee",
  });

  const visibleUsers = useMemo(() => {
    const otherUsers = users.filter((u) => u.id !== user?.id);
    if (!search) return otherUsers;
    const q = search.toLowerCase();
    return otherUsers.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  }, [users, search, user?.id]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/users"));
      setUsers(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const openCreate = useCallback(() => {
    setEditing(null);
    setForm({
      username: "",
      name: "",
      email: "",
      password: "",
      role: defaultRole,
    });
    modal.open();
  }, [modal, defaultRole]);

  const openEdit = useCallback(
    (u: UserData) => {
      setEditing(u);
      const roleValue = u.role === "user" ? "employee" : u.role;
      setForm({
        username: u.username,
        name: u.name,
        email: u.email,
        password: "",
        role: roles.some((r) => r.name === roleValue) ? roleValue : defaultRole,
      });
      modal.open();
    },
    [modal, roles, defaultRole],
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

    setPending(true);
    try {
      const payload: {
        username: string;
        name: string;
        email: string;
        role: string;
        password?: string;
      } = {
        username: form.username.trim(),
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
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
          toast.danger(body?.message ?? "Error al actualizar el usuario");
          return;
        }
        toast.success(
          body?.passwordUpdated
            ? "Usuario y contraseña actualizados"
            : "Usuario actualizado",
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
          toast.danger(body?.message ?? "Error al crear el usuario");
          return;
        }
        toast.success("Usuario creado");
      }
      closeModal();
      fetchUsers();
    } catch {
      toast.danger("Error al guardar el usuario");
    } finally {
      setPending(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este usuario?")) return;
    try {
      await fetch(apiUrl(`/api/users/${id}`), { method: "DELETE" });
      toast.success("Usuario eliminado");
      fetchUsers();
    } catch (e) {
      toast.danger(e instanceof Error ? e.message : "Error al eliminar");
    }
  };

  const columns = useMemo(
    () => [
      { accessorKey: "username" as const, header: "Usuario" },
      { accessorKey: "name" as const, header: "Nombre" },
      { accessorKey: "email" as const, header: "Correo" },
      { accessorKey: "role" as const, header: "Rol" },
    ],
    []
  );

  const table = useReactTable({
    data: visibleUsers,
    columns,
    pageCount: Math.ceil(visibleUsers.length / PAGE_SIZE),
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

  if (!user || user.role !== "admin") return null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={<Shield width={24} height={24} />}
        title="Usuarios"
        description="Administra los accesos y roles del equipo"
        action={
          <Button variant="primary" onPress={openCreate}>
            <Plus width={16} height={16} />
            Agregar usuario
          </Button>
        }
      />

      {loading ? (
        <ContentCard>
          <TableSkeleton />
        </ContentCard>
      ) : visibleUsers.length === 0 && !search ? (
        <ContentCard>
          <EmptyState
            icon={<Shield width={40} height={40} />}
            title="No hay otros usuarios"
            description="Crea cuentas para que tu equipo acceda a Scheduly."
            actionLabel="Agregar usuario"
            onAction={openCreate}
          />
        </ContentCard>
      ) : (
        <ContentCard>
          <div className="flex flex-col gap-4 p-6">
            <SearchField value={search} onChange={setSearch}>
              <Label>Buscar usuario</Label>
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input className="w-full sm:w-[320px]" placeholder="Usuario, nombre o correo..." />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
            <Table>
              <Table.ScrollContainer>
                <Table.Content aria-label="Usuarios" className="min-w-[500px]">
                  <Table.Header>
                    <Table.Column isRowHeader>Usuario</Table.Column>
                    <Table.Column>Nombre</Table.Column>
                    <Table.Column>Correo</Table.Column>
                    <Table.Column>Rol</Table.Column>
                    <Table.Column>Acciones</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {table.getRowModel().rows.length === 0 ? (
                      <Table.Row>
                        <Table.Cell colSpan={5}>
                          <div className="py-8 text-center text-sm text-muted">
                            No se encontraron usuarios con &quot;{search}&quot;
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    ) : (
                      table.getRowModel().rows.map((row) => {
                        const u = row.original;
                        return (
                          <Table.Row key={u.id}>
                            <Table.Cell>
                              <span className="font-medium">{u.username}</span>
                            </Table.Cell>
                            <Table.Cell>{u.name}</Table.Cell>
                            <Table.Cell className="text-muted">{u.email}</Table.Cell>
                            <Table.Cell>
                              <Chip color={roleColor[u.role] ?? "default"} variant="soft" size="sm">
                                {roleDisplayLabel(u.role)}
                              </Chip>
                            </Table.Cell>
                            <Table.Cell>
                              <div className="flex gap-1">
                                <Button isIconOnly size="sm" variant="ghost" onPress={() => openEdit(u)}>
                                  <Pencil width={16} height={16} />
                                </Button>
                                <Button isIconOnly size="sm" variant="danger" onPress={() => handleDelete(u.id)}>
                                  <TrashBin width={16} height={16} />
                                </Button>
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
            {visibleUsers.length > PAGE_SIZE && (
              <Table.Footer>
                <Pagination size="sm">
                  <Pagination.Summary>
                    {table.getState().pagination.pageIndex * PAGE_SIZE + 1} a{" "}
                    {Math.min((table.getState().pagination.pageIndex + 1) * PAGE_SIZE, visibleUsers.length)} de{" "}
                    {visibleUsers.length} resultados
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
                    {Array.from({ length: table.getPageCount() }, (_, i) => i + 1).map((p) => (
                      <Pagination.Item key={p}>
                        <Pagination.Link isActive={p === page} onPress={() => setPage(p)}>
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
                  <Shield width={20} height={20} />
                </Modal.Icon>
                <Modal.Heading>{editing ? "Editar usuario" : "Nuevo usuario"}</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} id="user-form">
                  <div className="flex flex-col gap-1">
                    <Label>Nombre de usuario</Label>
                    <Input
                      placeholder="ej: admin"
                      value={form.username}
                      onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label>Nombre completo</Label>
                    <Input
                      placeholder="Juan Pérez"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label>Correo</Label>
                    <Input
                      placeholder="juan@ejemplo.com"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label>{editing ? "Nueva contraseña (dejar vacío para mantener)" : "Contraseña"}</Label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      placeholder={editing ? "Escribe la nueva contraseña" : "••••••"}
                      value={form.password}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, password: e.target.value }))
                      }
                      className="rounded-xl border border-separator bg-field-background px-3 py-2 text-field-foreground placeholder:text-field-placeholder focus:outline-none focus:ring-2 focus:ring-focus"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label>Rol</Label>
                    {rolesLoading ? (
                      <p className="text-sm text-muted">Cargando roles...</p>
                    ) : roles.length === 0 ? (
                      <p className="text-sm text-muted">
                        No hay roles disponibles. Créalos en Administración → Roles.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {roles.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() =>
                              setForm((f) => ({ ...f, role: r.name }))
                            }
                            className={`px-3 py-1.5 rounded-xl text-sm border transition-colors ${
                              form.role === r.name
                                ? "bg-accent text-accent-foreground border-accent"
                                : "bg-field-background text-field-foreground border-separator"
                            }`}
                          >
                            {roleDisplayLabel(r.name)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </form>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onPress={closeModal}>Cancelar</Button>
                <Button type="submit" variant="primary" isDisabled={pending} form="user-form">
                  {pending ? "Guardando..." : editing ? "Actualizar" : "Guardar"}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
