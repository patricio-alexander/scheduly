"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Button,
  ComboBox,
  Input,
  Label,
  ListBox,
  Modal,
  Switch,
  useOverlayState,
  toast,
} from "@heroui/react";
import Plus from "@gravity-ui/icons/Plus";
import Pencil from "@gravity-ui/icons/PencilToSquare";
import TrashBin from "@gravity-ui/icons/TrashBin";
import CrownDiamond from "@gravity-ui/icons/CrownDiamond";
import { AppNumberField } from "@/shared/components/AppNumberField";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { SelectField } from "@/shared/components/SelectField";
import { ContentCard, EmptyState } from "@/shared/components/ui";
import { formatRewardApplyLabel, rewardApplyTypeFromRecord } from "@/shared/utils/reward-apply";
import { useProducts } from "@/src/features/products";
import { useServices } from "@/src/features/services";
import type { LoyaltyReward, RewardFormData } from "../types";
import * as loyaltyService from "../services/loyalty-service";

const emptyForm: RewardFormData = {
  name: "",
  description: "",
  pointsCost: 50,
  sortOrder: 0,
  isActive: true,
  applyType: "general",
  serviceId: null,
  productId: null,
  discountPct: null,
};

const applyTypeOptions = [
  { id: "general", label: "Beneficio general" },
  { id: "service", label: "Aplica a un servicio" },
  { id: "product", label: "Aplica a un producto" },
];

export function RewardsManager() {
  const { services } = useServices();
  const { products } = useProducts();
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState<LoyaltyReward | null>(null);
  const [form, setForm] = useState<RewardFormData>(emptyForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const modal = useOverlayState();
  const deleteConfirm = useOverlayState();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRewards(await loyaltyService.fetchRewards());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    modal.open();
  };

  const openEdit = (reward: LoyaltyReward) => {
    setEditing(reward);
    setForm({
      name: reward.name,
      description: reward.description,
      pointsCost: reward.pointsCost,
      sortOrder: reward.sortOrder,
      isActive: reward.isActive,
      applyType: rewardApplyTypeFromRecord(reward),
      serviceId: reward.serviceId,
      productId: reward.productId,
      discountPct: reward.discountPct,
    });
    modal.open();
  };

  const handleApplyTypeChange = (key: string | null) => {
    const applyType = (key ?? "general") as RewardFormData["applyType"];
    setForm((f) => ({
      ...f,
      applyType,
      serviceId: applyType === "service" ? f.serviceId : null,
      productId: applyType === "product" ? f.productId : null,
      discountPct: applyType === "general" ? null : f.discountPct,
    }));
  };

  const handleSubmit = async () => {
    setPending(true);
    try {
      if (editing) {
        await loyaltyService.updateReward(editing.id, form);
        toast.success("Premio actualizado");
      } else {
        await loyaltyService.createReward(form);
        toast.success("Premio creado");
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
      await loyaltyService.deleteReward(deleteId);
      toast.success("Premio eliminado");
      deleteConfirm.close();
      setDeleteId(null);
      await load();
    } catch (e) {
      toast.danger(e instanceof Error ? e.message : "Error al eliminar");
    }
  };

  const deleteTarget = deleteId != null ? rewards.find((r) => r.id === deleteId) : null;

  return (
    <>
      <ContentCard>
        <div className="flex flex-col gap-4 p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Premios canjeables</h2>
              <p className="text-sm text-muted">
                Los clientes gastan puntos para reclamar estos beneficios
              </p>
            </div>
            <Button variant="primary" onPress={openCreate}>
              <Plus width={16} height={16} />
              Nuevo premio
            </Button>
          </div>

          {loading ? (
            <div className="h-24 animate-pulse rounded-xl bg-surface-secondary" />
          ) : rewards.length === 0 ? (
            <EmptyState
              icon={<CrownDiamond width={36} height={36} />}
              title="Sin premios"
              description="Crea premios que los clientes puedan canjear con sus puntos."
              actionLabel="Nuevo premio"
              onAction={openCreate}
            />
          ) : (
            <ul className="grid gap-3">
              {rewards.map((reward) => {
                const applyLabel = formatRewardApplyLabel(reward);
                return (
                  <li
                    key={reward.id}
                    className="flex flex-col gap-3 rounded-2xl border border-separator bg-surface-secondary/30 p-4 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{reward.name}</h3>
                        {!reward.isActive ? (
                          <span className="rounded-full bg-surface-secondary px-2 py-0.5 text-xs text-muted">
                            Inactivo
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-muted">{reward.description}</p>
                      {applyLabel ? (
                        <p className="mt-1 text-xs font-medium text-accent">{applyLabel}</p>
                      ) : (
                        <p className="mt-1 text-xs text-muted">Beneficio general</p>
                      )}
                      {reward.discountPct ? (
                        <p className="mt-0.5 text-xs text-muted">
                          Descuento: {reward.discountPct}%
                        </p>
                      ) : null}
                      <p className="mt-2 text-sm font-bold text-accent">
                        {reward.pointsCost} puntos
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button isIconOnly size="sm" variant="ghost" onPress={() => openEdit(reward)}>
                        <Pencil width={16} height={16} />
                      </Button>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="danger"
                        onPress={() => openDeleteConfirm(reward.id)}
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
                <Modal.Heading>{editing ? "Editar premio" : "Nuevo premio"}</Modal.Heading>
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

                <SelectField
                  label="¿A qué aplica?"
                  selectedKey={form.applyType}
                  onSelectionChange={handleApplyTypeChange}
                  options={applyTypeOptions}
                />

                {form.applyType === "service" ? (
                  <ComboBox
                    selectedKey={form.serviceId != null ? String(form.serviceId) : null}
                    onSelectionChange={(key) =>
                      setForm((f) => ({
                        ...f,
                        serviceId: key != null ? Number(key) : null,
                      }))
                    }
                    variant="secondary"
                  >
                    <Label className="text-sm font-medium">Servicio</Label>
                    <ComboBox.InputGroup>
                      <Input placeholder="Buscar servicio..." />
                      <ComboBox.Trigger />
                    </ComboBox.InputGroup>
                    <ComboBox.Popover>
                      <ListBox>
                        {services.map((service) => (
                          <ListBox.Item
                            key={String(service.id)}
                            id={String(service.id)}
                            textValue={service.name}
                          >
                            {service.name}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </ComboBox.Popover>
                  </ComboBox>
                ) : null}

                {form.applyType === "product" ? (
                  <ComboBox
                    selectedKey={form.productId != null ? String(form.productId) : null}
                    onSelectionChange={(key) =>
                      setForm((f) => ({
                        ...f,
                        productId: key != null ? Number(key) : null,
                      }))
                    }
                    variant="secondary"
                  >
                    <Label className="text-sm font-medium">Producto</Label>
                    <ComboBox.InputGroup>
                      <Input placeholder="Buscar producto..." />
                      <ComboBox.Trigger />
                    </ComboBox.InputGroup>
                    <ComboBox.Popover>
                      <ListBox>
                        {products.map((product) => (
                          <ListBox.Item
                            key={String(product.id)}
                            id={String(product.id)}
                            textValue={product.name}
                          >
                            {product.name}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </ComboBox.Popover>
                  </ComboBox>
                ) : null}

                {form.applyType !== "general" ? (
                  <AppNumberField
                    label="Descuento %"
                    minValue={1}
                    maxValue={100}
                    value={form.discountPct ?? undefined}
                    onChange={(discountPct) =>
                      setForm((f) => ({ ...f, discountPct }))
                    }
                  />
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <AppNumberField
                    label="Costo en puntos"
                    minValue={1}
                    value={form.pointsCost}
                    onChange={(pointsCost) => setForm((f) => ({ ...f, pointsCost }))}
                  />
                  <AppNumberField
                    label="Orden"
                    value={form.sortOrder}
                    onChange={(sortOrder) => setForm((f) => ({ ...f, sortOrder }))}
                  />
                </div>
                <Switch
                  isSelected={form.isActive}
                  onChange={(checked) => setForm((f) => ({ ...f, isActive: checked }))}
                >
                  Activo
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
          title="Eliminar premio"
          status="danger"
          confirmLabel="Eliminar"
          confirmVariant="danger"
          description={
            <p>
              ¿Eliminar el premio <strong>{deleteTarget.name}</strong>? Esta acción no se puede
              deshacer.
            </p>
          }
          onConfirm={handleConfirmDelete}
        />
      ) : null}
    </>
  );
}
