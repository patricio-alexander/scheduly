"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Modal, useOverlayState, toast } from "@heroui/react";
import ListCheck from "@gravity-ui/icons/ListCheck";
import Plus from "@gravity-ui/icons/Plus";
import { PageHeader } from "@/shared/components/ui";
import { useAuth } from "@/src/features/auth";
import { isAdminRole } from "@/shared/utils/roles";
import {
  TaskForm,
  TaskKanban,
  useTasks,
  type Task,
  type TaskFormData,
  type TaskStatus,
} from "@/src/features/tasks";
import { apiUrl } from "@/shared/utils/api";
import {
  EntityCreateHelpButton,
  EntityCreateTutorialProvider,
  useEntityCreateTourDemo,
  ENTITY_CREATE_DEMOS,
} from "@/src/features/tutorials";
import {
  ENTITY_MODAL_DIALOG_CLASS,
  ENTITY_MODAL_BODY_CLASS,
  ENTITY_MODAL_HEADER_CLASS,
} from "@/shared/components/entity-modal";

interface StaffUser {
  id: number;
  name: string;
}

export default function TasksPage() {
  const { user } = useAuth();
  const isAdmin = isAdminRole(user?.role);
  const { tasks, loading, error, refetch, create, update, move, remove } =
    useTasks({
      assigneeId: isAdmin ? null : (user?.id ?? null),
    });
  const [assignees, setAssignees] = useState<StaffUser[]>([]);
  const [editing, setEditing] = useState<Task | null>(null);
  const [createStatus, setCreateStatus] = useState<TaskStatus>("todo");
  const [pending, setPending] = useState(false);
  const modal = useOverlayState();

  useEffect(() => {
    if (!isAdmin) return;
    fetch(apiUrl("/api/users"))
      .then((r) => (r.ok ? r.json() : []))
      .then((users: StaffUser[]) => {
        if (Array.isArray(users)) {
          setAssignees(
            users.map((u) => ({ id: u.id, name: u.name })).sort((a, b) =>
              a.name.localeCompare(b.name),
            ),
          );
        }
      })
      .catch(() => {});
  }, [isAdmin]);

  const openCreate = useCallback(
    (status: TaskStatus = "todo") => {
      if (!isAdmin) return;
      setEditing(null);
      setCreateStatus(status);
      modal.open();
    },
    [modal, isAdmin],
  );

  const openEdit = useCallback(
    (task: Task) => {
      setEditing(task);
      modal.open();
    },
    [modal],
  );

  const closeModal = useCallback(() => {
    modal.close();
    setEditing(null);
  }, [modal]);

  const {
    displayItems,
    isTourDemo,
    prepareTour,
    cleanupTour,
    commitDemoCreate,
    tourActive,
  } = useEntityCreateTourDemo<Task>({
    moduleId: "tasks",
    items: tasks,
    openCreate: () => openCreate("todo"),
    closeModal,
    buildDemoItem: () => {
      const now = new Date().toISOString();
      return {
        id: -9001,
        title: ENTITY_CREATE_DEMOS.tasks.title,
        description: ENTITY_CREATE_DEMOS.tasks.description,
        status: "todo",
        priority: "medium",
        assigneeId: null,
        dueDate: null,
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
        assignee: null,
      };
    },
  });

  const handleSubmit = useCallback(
    async (data: TaskFormData) => {
      if (isTourDemo() && commitDemoCreate()) return;
      setPending(true);
      try {
        const payload = isAdmin
          ? data
          : { ...data, assigneeId: user?.id ?? data.assigneeId };
        if (editing) {
          await update(editing.id, payload);
          toast.success("Tarea actualizada");
        } else {
          await create(payload);
          toast.success("Tarea creada");
        }
        closeModal();
      } catch (e) {
        toast.danger(e instanceof Error ? e.message : "No se pudo guardar");
      } finally {
        setPending(false);
      }
    },
    [
      editing,
      create,
      update,
      closeModal,
      isAdmin,
      user?.id,
      isTourDemo,
      commitDemoCreate,
    ],
  );

  const handleDelete = useCallback(
    async (task: Task) => {
      if (!isAdmin) return;
      if (!confirm(`¿Eliminar la tarea "${task.title}"?`)) return;
      try {
        await remove(task.id);
        toast.success("Tarea eliminada");
      } catch (e) {
        toast.danger(e instanceof Error ? e.message : "No se pudo eliminar");
      }
    },
    [remove, isAdmin],
  );

  const handleMove = useCallback(
    async (taskId: number, status: TaskStatus) => {
      try {
        await move(taskId, status);
      } catch (e) {
        toast.danger(e instanceof Error ? e.message : "No se pudo mover");
      }
    },
    [move],
  );

  if (!user) return null;

  const doneCount = displayItems.filter((t) => t.status === "done").length;
  const openCount = displayItems.length - doneCount;

  return (
    <EntityCreateTutorialProvider
      moduleId="tasks"
      prepareTour={prepareTour}
      cleanupTour={cleanupTour}
      openCreateForm={() => openCreate("todo")}
      resetFormTour={closeModal}
      enabled={isAdmin}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <PageHeader
          icon={<ListCheck width={24} height={24} />}
          title={isAdmin ? "Tareas" : "Mis tareas"}
          description={
            loading && !tourActive
              ? "Cargando tablero..."
              : displayItems.length === 0
                ? isAdmin
                  ? "Todavía no hay tareas · crea la primera"
                  : "No tienes tareas asignadas"
                : `${openCount} pendientes · ${doneCount} hechas`
          }
          action={
            isAdmin ? (
              <div className="flex items-center gap-2">
                <EntityCreateHelpButton title="Tutorial: Tareas" />
                <Button
                  onPress={() => openCreate("todo")}
                  data-tour="tasks-create"
                >
                  <Plus width={16} height={16} />
                  Nueva tarea
                </Button>
              </div>
            ) : undefined
          }
        />

        {error ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">{error}</p>
            <Button size="sm" variant="secondary" onPress={() => void refetch()}>
              Reintentar
            </Button>
          </div>
        ) : null}

        <div
          data-tour={
            displayItems.length === 0 ? "tasks-empty" : "tasks-list"
          }
        >
          <TaskKanban
            tasks={displayItems}
            loading={loading && !tourActive}
            onAdd={isAdmin ? openCreate : undefined}
            onEdit={openEdit}
            onDelete={isAdmin ? handleDelete : undefined}
            onMove={handleMove}
          />
        </div>

        <Modal state={modal}>
          <Modal.Backdrop>
            <Modal.Container placement="center">
              <Modal.Dialog className={ENTITY_MODAL_DIALOG_CLASS}>
                <Modal.CloseTrigger />
                <Modal.Header className={ENTITY_MODAL_HEADER_CLASS}>
                  <Modal.Icon>
                    <ListCheck width={20} height={20} />
                  </Modal.Icon>
                  <Modal.Heading>
                    {editing ? "Editar tarea" : "Nueva tarea"}
                  </Modal.Heading>
                  <div className="ml-auto">
                    <EntityCreateHelpButton
                      inModal
                      title="Tutorial: cómo registrar una tarea"
                    />
                  </div>
                </Modal.Header>
                <Modal.Body className={ENTITY_MODAL_BODY_CLASS}>
                  <TaskForm
                    key={editing?.id ?? `new-${createStatus}`}
                    formId="task-form"
                    defaultValues={editing ?? undefined}
                    defaultStatus={createStatus}
                    assignees={
                      isAdmin
                        ? assignees
                        : [{ id: user.id, name: user.name }]
                    }
                    onSubmit={handleSubmit}
                  />
                </Modal.Body>
                <Modal.Footer>
                  <Button
                    variant="secondary"
                    onPress={closeModal}
                    isDisabled={pending}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    form="task-form"
                    variant="primary"
                    isDisabled={pending}
                    data-tour="tasks-form-submit"
                  >
                    {pending
                      ? "Guardando..."
                      : editing
                        ? "Guardar"
                        : "Crear tarea"}
                  </Button>
                </Modal.Footer>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      </div>
    </EntityCreateTutorialProvider>
  );
}
