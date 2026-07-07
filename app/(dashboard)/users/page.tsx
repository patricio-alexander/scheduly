"use client";

import { apiUrl } from "@/shared/utils/api";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Button, Modal, useOverlayState, Input, Label, toast, Table, Pagination, SearchField, Chip } from "@heroui/react";
import { useAuth } from "@/src/features/auth";
import { ContentCard, EmptyState, PageHeader, TableSkeleton } from "@/shared/components/ui";
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

const roleLabel: Record<string, string> = {
  admin: "Admin",
  user: "Usuario",
};

const roleColor: Record<string, "accent" | "default"> = {
  admin: "accent",
  user: "default",
};

export default function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<UserData | null>(null);
  const [pending, setPending] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const modal = useOverlayState();

  const [form, setForm] = useState({ username: "", name: "", email: "", password: "", role: "user" });

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
    setForm({ username: "", name: "", email: "", password: "", role: "user" });
    modal.open();
  }, [modal]);

  const openEdit = useCallback((u: UserData) => {
    setEditing(u);
    setForm({ username: u.username, name: u.name, email: u.email, password: "", role: u.role });
    modal.open();
  }, [modal]);

  const closeModal = useCallback(() => {
    modal.close();
    setEditing(null);
  }, [modal]);

  const handleSubmit = async () => {
    if (!form.username || !form.name || !form.email) return;
    setPending(true);
    try {
      if (editing) {
        await fetch(apiUrl(`/api/users/${editing.id}`), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        toast.success("Usuario actualizado");
      } else {
        await fetch(apiUrl("/api/users"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
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
                                {roleLabel[u.role] ?? u.role}
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
                    <Input
                      type="password"
                      placeholder="••••••"
                      value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label>Rol</Label>
                    <div className="flex gap-2">
                      {["user", "admin"].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, role: r }))}
                          className={`px-3 py-1.5 rounded-xl text-sm border transition-colors ${
                            form.role === r
                              ? "bg-accent text-accent-foreground border-accent"
                              : "bg-field-background text-field-foreground border-separator"
                          }`}
                        >
                          {r === "admin" ? "Admin" : "Usuario"}
                        </button>
                      ))}
                    </div>
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
