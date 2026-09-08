"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Modal, Switch, useOverlayState, toast } from "@heroui/react";
import Plus from "@gravity-ui/icons/Plus";
import Pencil from "@gravity-ui/icons/PencilToSquare";
import TrashBin from "@gravity-ui/icons/TrashBin";
import Tag from "@gravity-ui/icons/Tag";
import { AppNumberField } from "@/shared/components/AppNumberField";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { ContentCard, EmptyState } from "@/shared/components/ui";
import type { LoyaltyOffer, OfferFormData } from "../types";
import * as loyaltyService from "../services/loyalty-service";

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatRange(startsAt: string, endsAt: string | null) {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("es-EC", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  return endsAt ? `${fmt(startsAt)} → ${fmt(endsAt)}` : `Desde ${fmt(startsAt)}`;
}

function offerStatus(offer: LoyaltyOffer) {
  const now = Date.now();
  const start = new Date(offer.startsAt).getTime();
  const end = offer.endsAt ? new Date(offer.endsAt).getTime() : null;
  if (!offer.isActive) return "Inactiva";
  if (start > now) return "Programada";
  if (end != null && end < now) return "Vencida";
  return "Activa";
}

const WEEKDAY_LABELS = [
  { d: 1, label: "Lun" },
  { d: 2, label: "Mar" },
  { d: 3, label: "Mié" },
  { d: 4, label: "Jue" },
  { d: 5, label: "Vie" },
  { d: 6, label: "Sáb" },
  { d: 0, label: "Dom" },
] as const;

function formatWeekdays(weekdays: number[] | null | undefined) {
  if (!weekdays || weekdays.length === 0) return "Todos los días";
  return WEEKDAY_LABELS.filter((w) => weekdays.includes(w.d))
    .map((w) => w.label)
    .join(" · ");
}

const emptyForm = (): OfferFormData => ({
  name: "",
  description: "",
  discountPct: 10,
  discountFixed: null,
  comboLabel: "",
  startsAt: toLocalInput(new Date().toISOString()),
  endsAt: "",
  isActive: true,
  weekdays: [1, 2, 3, 4, 5, 6],
});

export function OffersManager() {
  const [offers, setOffers] = useState<LoyaltyOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState<LoyaltyOffer | null>(null);
  const [form, setForm] = useState<OfferFormData>(emptyForm());
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const modal = useOverlayState();
  const deleteConfirm = useOverlayState();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setOffers(await loyaltyService.fetchOffers(true));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    modal.open();
  };

  const openEdit = (offer: LoyaltyOffer) => {
    setEditing(offer);
    setForm({
      name: offer.name,
      description: offer.description,
      discountPct: offer.discountPct,
      discountFixed: offer.discountFixed,
      comboLabel: offer.comboLabel ?? "",
      startsAt: toLocalInput(offer.startsAt),
      endsAt: toLocalInput(offer.endsAt),
      isActive: offer.isActive,
      weekdays: Array.isArray(offer.weekdays)
        ? offer.weekdays.map(Number).filter((n) => n >= 0 && n <= 6)
        : [],
    });
    modal.open();
  };

  const handleSubmit = async () => {
    setPending(true);
    try {
      const payload = {
        ...form,
        endsAt: form.endsAt.trim() ? form.endsAt : "",
      };
      if (editing) {
        await loyaltyService.updateOffer(editing.id, payload);
        toast.success("Oferta actualizada");
      } else {
        await loyaltyService.createOffer(payload);
        toast.success("Oferta creada");
      }
      modal.close();
      await load();
    } catch (e) {
      toast.danger(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setPending(false);
    }
  };

  const openDeleteConfirm = (id: number) => {
    setDeleteId(id);
    deleteConfirm.open();
  };

  const handleConfirmDelete = async () => {
    if (deleteId == null) return;
    try {
      await loyaltyService.deleteOffer(deleteId);
      toast.success("Oferta eliminada");
      deleteConfirm.close();
      setDeleteId(null);
      await load();
    } catch (e) {
      toast.danger(e instanceof Error ? e.message : "Error al eliminar");
    }
  };

  const deleteTarget = deleteId != null ? offers.find((o) => o.id === deleteId) : null;

  return (
    <>
      <ContentCard>
        <div className="flex flex-col gap-4 p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Ofertas por período / semana</h2>
              <p className="text-sm text-muted">
                Promociones con vigencia y días de la semana (ej. martes 2x1)
              </p>
            </div>
            <Button variant="primary" onPress={openCreate}>
              <Plus width={16} height={16} />
              Nueva oferta
            </Button>
          </div>

          {loading ? (
            <div className="h-24 animate-pulse rounded-xl bg-surface-secondary" />
          ) : offers.length === 0 ? (
            <EmptyState
              icon={<Tag width={36} height={36} />}
              title="Sin ofertas"
              description="Publica descuentos y combos con vigencia limitada."
              actionLabel="Nueva oferta"
              onAction={openCreate}
            />
          ) : (
            <ul className="grid gap-3">
              {offers.map((offer) => {
                const status = offerStatus(offer);
                return (
                  <li
                    key={offer.id}
                    className="flex flex-col gap-3 rounded-2xl border border-separator bg-surface-secondary/30 p-4 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{offer.name}</h3>
                        <span className="rounded-full bg-surface-secondary px-2 py-0.5 text-xs font-medium text-muted">
                          {status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted">{offer.description}</p>
                      <p className="mt-2 text-xs text-muted">
                        {formatRange(offer.startsAt, offer.endsAt)}
                      </p>
                      <p className="mt-1 text-xs font-medium text-foreground">
                        {formatWeekdays(
                          Array.isArray(offer.weekdays)
                            ? (offer.weekdays as number[])
                            : null,
                        )}
                      </p>
                      {offer.discountPct ? (
                        <p className="mt-1 text-sm font-bold text-accent">
                          {offer.discountPct}% de descuento
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button isIconOnly size="sm" variant="ghost" onPress={() => openEdit(offer)}>
                        <Pencil width={16} height={16} />
                      </Button>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="danger"
                        onPress={() => openDeleteConfirm(offer.id)}
                      >
                        <TrashBin width={16} height={16} />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </ContentCard>

      <Modal state={modal}>
        <Modal.Backdrop>
          <Modal.Container placement="center" scroll="inside">
            <Modal.Dialog className="!max-w-lg">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>{editing ? "Editar oferta" : "Nueva oferta"}</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="flex flex-col gap-4">
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="font-medium">Nombre</span>
                  <input
                    className="rounded-xl border border-separator bg-surface px-3 py-2"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="font-medium">Descripción</span>
                  <textarea
                    className="min-h-20 rounded-xl border border-separator bg-surface px-3 py-2"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <AppNumberField
                    label="Descuento %"
                    minValue={0}
                    maxValue={100}
                    value={form.discountPct}
                    onChange={(discountPct) =>
                      setForm((f) => ({ ...f, discountPct }))
                    }
                  />
                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="font-medium">Etiqueta combo</span>
                    <input
                      className="rounded-xl border border-separator bg-surface px-3 py-2"
                      value={form.comboLabel}
                      onChange={(e) => setForm((f) => ({ ...f, comboLabel: e.target.value }))}
                      placeholder="Ej. Combo verano"
                    />
                  </label>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="font-medium">Inicio</span>
                    <input
                      type="datetime-local"
                      className="rounded-xl border border-separator bg-surface px-3 py-2"
                      value={form.startsAt}
                      onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="font-medium">Fin (opcional)</span>
                    <input
                      type="datetime-local"
                      className="rounded-xl border border-separator bg-surface px-3 py-2"
                      value={form.endsAt}
                      onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
                    />
                  </label>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium">
                    Días de la semana (vacío = todos)
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAY_LABELS.map((w) => {
                      const on = form.weekdays.includes(w.d);
                      return (
                        <button
                          key={w.d}
                          type="button"
                          className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                            on
                              ? "bg-accent text-accent-foreground"
                              : "bg-surface-secondary text-muted hover:text-foreground"
                          }`}
                          onClick={() =>
                            setForm((f) => ({
                              ...f,
                              weekdays: on
                                ? f.weekdays.filter((d) => d !== w.d)
                                : [...f.weekdays, w.d].sort(),
                            }))
                          }
                        >
                          {w.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <Switch
                  isSelected={form.isActive}
                  onChange={(checked) => setForm((f) => ({ ...f, isActive: checked }))}
                >
                  Activa
                </Switch>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onPress={() => modal.close()}>
                  Cancelar
                </Button>
                <Button variant="primary" isDisabled={pending} onPress={() => void handleSubmit()}>
                  {pending ? "Guardando..." : editing ? "Actualizar" : "Guardar"}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {deleteTarget ? (
        <ConfirmDialog
          state={deleteConfirm}
          title="Eliminar oferta"
          status="danger"
          confirmLabel="Eliminar"
          confirmVariant="danger"
          description={
            <p>
              ¿Eliminar la oferta <strong>{deleteTarget.name}</strong>? Esta acción no se puede
              deshacer.
            </p>
          }
          onConfirm={handleConfirmDelete}
        />
      ) : null}
    </>
  );
}
