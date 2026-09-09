"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  Tooltip,
} from "@heroui/react";
import House from "@gravity-ui/icons/House";
import Plus from "@gravity-ui/icons/Plus";
import Persons from "@gravity-ui/icons/Persons";
import Xmark from "@gravity-ui/icons/Xmark";
import CrownDiamond from "@gravity-ui/icons/CrownDiamond";
import ArrowRightArrowLeft from "@gravity-ui/icons/ArrowRightArrowLeft";
import {
  ContentCard,
  EmptyState,
  PageHeader,
} from "@/shared/components/ui";
import { SearchableSelect } from "@/shared/components/SearchableSelect";
import { SelectField } from "@/shared/components/SelectField";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { roleDisplayLabel } from "@/shared/utils/system-roles";
import { formatBranchLabel } from "@/shared/utils/branches";
import { isBranchAdminRole, isOwnerRole } from "@/shared/utils/roles";
import {
  BranchesOverviewHelpButton,
  BranchesFormHelpButton,
  BranchesTeamHelpButton,
  BranchesTutorialProvider,
  BRANCHES_TEAM_DEMO,
  BRANCHES_OVERVIEW_DEMO_BRANCH,
  BRANCHES_OVERVIEW_DEMO_FORM,
  TOUR_BRANCHES_ACTION_EVENT,
  type TourBranchesAction,
} from "@/src/features/tutorials";
import {
  ENTITY_MODAL_DIALOG_CLASS,
  ENTITY_MODAL_BODY_CLASS,
  ENTITY_MODAL_HEADER_CLASS,
  ENTITY_FORM_CLASS,
} from "@/shared/components/entity-modal";

type TeamMember = {
  id: number;
  username: string;
  name: string;
  role: string;
  isActive: boolean;
  isPrimary: boolean;
  isManager?: boolean;
};

type AvailableAccount = {
  id: number;
  username: string;
  name: string;
  role: string;
  isActive: boolean;
  currentBranchId?: number | null;
  currentBranchName?: string | null;
  unlinked?: boolean;
};

type OtherBranch = { id: number; name: string };

type BranchRow = {
  id: number;
  name: string;
  code: string;
  address: string;
  phone: string | null;
  isMain: boolean;
  locationKind?: string | null;
  teamCount: number;
  managerAccountId?: number | null;
  team?: TeamMember[];
};

export default function BranchesPage() {
  const { user } = useAuth();
  const isOwner = user?.role === "owner";
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const createModal = useOverlayState();
  const teamModal = useOverlayState();
  const confirmModal = useOverlayState();
  const [activeBranch, setActiveBranch] = useState<BranchRow | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [available, setAvailable] = useState<AvailableAccount[]>([]);
  const [otherBranches, setOtherBranches] = useState<OtherBranch[]>([]);
  const [managerAccountId, setManagerAccountId] = useState<number | null>(null);
  const [linkAccountId, setLinkAccountId] = useState<string>("");
  const [moveTargetByMember, setMoveTargetByMember] = useState<
    Record<number, string>
  >({});
  const [teamLoading, setTeamLoading] = useState(false);
  const [tourRunning, setTourRunning] = useState(false);
  const [movePanelId, setMovePanelId] = useState<number | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<
    | {
        kind: "unlink";
        accountId: number;
        name: string;
      }
    | {
        kind: "move";
        accountId: number;
        name: string;
        toBranchId: number;
        destName: string;
      }
    | {
        kind: "manager";
        accountId: number;
        name: string;
        previousName: string | null;
      }
    | {
        kind: "clear-manager";
        accountId: number;
        name: string;
      }
    | null
  >(null);
  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
  });
  const openTeamRef = useRef<(b: BranchRow) => void>(() => {});
  const handleCreateRef = useRef<() => void>(() => {});
  const teamTourDemoRef = useRef(false);
  const overviewTourDemoRef = useRef(false);
  /** null = datos reales; [] = vacío simulado; [...] = locales demo del overview. */
  const [tourBranchesOverride, setTourBranchesOverride] = useState<
    BranchRow[] | null
  >(null);

  const displayBranches = tourBranchesOverride ?? branches;

  const applyTeamTourDemo = useCallback(
    (branchId: number) => {
      const idx = Math.max(
        0,
        branches.findIndex((b) => b.id === branchId),
      );
      const demoTeam = (
        idx === 0 ? BRANCHES_TEAM_DEMO.teamA : BRANCHES_TEAM_DEMO.teamB
      ).map((m) => ({ ...m }));
      const others = branches
        .filter((b) => b.id !== branchId)
        .map((b) => ({ id: b.id, name: b.name }));
      setTeam(demoTeam);
      setAvailable(BRANCHES_TEAM_DEMO.available.map((a) => ({ ...a })));
      setManagerAccountId(demoTeam.find((m) => m.isManager)?.id ?? null);
      setOtherBranches(
        others.length > 0
          ? others
          : [{ id: -999, name: "Local Norte (demo)" }],
      );
      setLinkAccountId("");
      setMoveTargetByMember({});
      setMovePanelId(null);
      setTeamLoading(false);
    },
    [branches],
  );

  const prepareTeamTour = useCallback(() => {
    teamTourDemoRef.current = true;
    overviewTourDemoRef.current = false;
    setTourBranchesOverride(null);
    const id = activeBranch?.id ?? branches[0]?.id;
    if (id != null) applyTeamTourDemo(id);
  }, [activeBranch?.id, branches, applyTeamTourDemo]);

  const prepareOverviewTour = useCallback(() => {
    overviewTourDemoRef.current = true;
    teamTourDemoRef.current = false;
    setTourBranchesOverride([]);
    setForm({ name: "", address: "", phone: "" });
    createModal.close();
    teamModal.close();
  }, [createModal, teamModal]);

  const cleanupOverviewTour = useCallback(() => {
    overviewTourDemoRef.current = false;
    setTourBranchesOverride(null);
    setForm({ name: "", address: "", phone: "" });
    createModal.close();
  }, [createModal]);

  const resetCreateFormTour = useCallback(() => {
    setForm({ name: "", address: "", phone: "" });
    createModal.close();
  }, [createModal]);

  const closeTeamForTour = useCallback(() => {
    teamModal.close();
  }, [teamModal]);

  const openTeamForTour = useCallback(() => {
    const first = (tourBranchesOverride ?? branches)[0] ?? branches[0];
    if (first) openTeamRef.current(first);
  }, [branches, tourBranchesOverride]);

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
    createModal.open();
  };

  const handleCreate = async () => {
    if (overviewTourDemoRef.current) {
      const demo: BranchRow = {
        ...BRANCHES_OVERVIEW_DEMO_BRANCH,
        name:
          form.name.trim() ||
          BRANCHES_OVERVIEW_DEMO_FORM.name ||
          BRANCHES_OVERVIEW_DEMO_BRANCH.name,
        address:
          form.address.trim() ||
          BRANCHES_OVERVIEW_DEMO_FORM.address ||
          BRANCHES_OVERVIEW_DEMO_BRANCH.address,
        phone:
          form.phone.trim() ||
          BRANCHES_OVERVIEW_DEMO_FORM.phone ||
          BRANCHES_OVERVIEW_DEMO_BRANCH.phone,
        team: BRANCHES_OVERVIEW_DEMO_BRANCH.team.map((m) => ({ ...m })),
      };
      setTourBranchesOverride([demo]);
      createModal.close();
      setForm({ name: "", address: "", phone: "" });
      toast.success("(Demo) Local creado — no se guardó");
      return;
    }

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
      createModal.close();
      fetchBranches();
    } catch {
      toast.danger("Error al crear el local");
    } finally {
      setPending(false);
    }
  };
  handleCreateRef.current = () => {
    void handleCreate();
  };

  useEffect(() => {
    const onBranchesTourAction = (ev: Event) => {
      const detail = (ev as CustomEvent<TourBranchesAction>).detail;
      if (!detail) return;
      if (detail.type === "open-create") {
        overviewTourDemoRef.current = true;
        setForm({ name: "", address: "", phone: "" });
        createModal.open();
        return;
      }
      if (detail.type === "set-create-form") {
        setForm((prev) => ({
          name: detail.name ?? prev.name,
          address: detail.address ?? prev.address,
          phone: detail.phone ?? prev.phone,
        }));
        return;
      }
      if (detail.type === "submit-create") {
        overviewTourDemoRef.current = true;
        handleCreateRef.current();
      }
    };
    window.addEventListener(TOUR_BRANCHES_ACTION_EVENT, onBranchesTourAction);
    return () =>
      window.removeEventListener(
        TOUR_BRANCHES_ACTION_EVENT,
        onBranchesTourAction,
      );
  }, [createModal]);

  const loadTeam = useCallback(async (branchId: number) => {
    if (teamTourDemoRef.current) {
      applyTeamTourDemo(branchId);
      return;
    }
    setTeamLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/branches/${branchId}/members`), {
        credentials: "include",
      });
      const body = (await res.json().catch(() => null)) as {
        message?: string;
        team?: TeamMember[];
        available?: AvailableAccount[];
        otherBranches?: OtherBranch[];
        managerAccountId?: number | null;
      } | null;
      if (teamTourDemoRef.current) {
        applyTeamTourDemo(branchId);
        return;
      }
      if (!res.ok) {
        toast.danger(body?.message ?? "No se pudo cargar el equipo");
        return;
      }
      setTeam(body?.team ?? []);
      setAvailable(body?.available ?? []);
      setOtherBranches(body?.otherBranches ?? []);
      setManagerAccountId(body?.managerAccountId ?? null);
      setLinkAccountId("");
      setMoveTargetByMember({});
      setMovePanelId(null);
    } finally {
      if (!teamTourDemoRef.current) setTeamLoading(false);
    }
  }, [applyTeamTourDemo]);

  const cleanupTeamTour = useCallback(() => {
    teamTourDemoRef.current = false;
    setMovePanelId(null);
    setLinkAccountId("");
    setMoveTargetByMember({});
    const id = activeBranch?.id ?? branches[0]?.id;
    if (id != null) void loadTeam(id);
  }, [activeBranch?.id, branches, loadTeam]);

  const openTeam = (b: BranchRow) => {
    setActiveBranch(b);
    setTeam(b.team ?? []);
    setAvailable([]);
    setOtherBranches([]);
    setManagerAccountId(b.managerAccountId ?? null);
    setLinkAccountId("");
    setMoveTargetByMember({});
    setMovePanelId(null);
    teamModal.open();
    void loadTeam(b.id);
  };
  openTeamRef.current = openTeam;

  /** Cambia de pestaña (local) dentro del modal de equipo. */
  const selectBranchTab = useCallback(
    (branchId: number) => {
      const b = branches.find((x) => x.id === branchId);
      if (!b) return;
      setActiveBranch(b);
      setLinkAccountId("");
      setMoveTargetByMember({});
      setMovePanelId(null);
      if (teamTourDemoRef.current) {
        applyTeamTourDemo(branchId);
        return;
      }
      setTeam(b.team ?? []);
      setAvailable([]);
      setManagerAccountId(b.managerAccountId ?? null);
      void loadTeam(b.id);
    },
    [branches, loadTeam, applyTeamTourDemo],
  );

  const applyTeamUpdate = (next: TeamMember[], nextManager?: number | null) => {
    setTeam(next);
    if (nextManager !== undefined) setManagerAccountId(nextManager);
    if (activeBranch) {
      setBranches((prev) =>
        prev.map((b) =>
          b.id === activeBranch.id
            ? {
                ...b,
                team: next,
                teamCount: next.length,
                managerAccountId:
                  nextManager !== undefined
                    ? nextManager
                    : b.managerAccountId,
              }
            : b,
        ),
      );
      setActiveBranch((prev) =>
        prev && prev.id === activeBranch.id
          ? {
              ...prev,
              team: next,
              teamCount: next.length,
              managerAccountId:
                nextManager !== undefined
                  ? nextManager
                  : prev.managerAccountId,
            }
          : prev,
      );
    }
  };

  const handleLink = async () => {
    if (!activeBranch || !linkAccountId) {
      toast.danger("Elige una cuenta para vincular");
      return;
    }

    if (teamTourDemoRef.current) {
      const person = available.find((a) => String(a.id) === linkAccountId);
      if (!person) return;
      setTeam((prev) => [
        ...prev,
        {
          id: person.id,
          username: person.username,
          name: person.name,
          role: person.role,
          isActive: person.isActive,
          isPrimary: true,
          isManager: false,
        },
      ]);
      setAvailable((prev) => prev.filter((a) => a.id !== person.id));
      setLinkAccountId("");
      toast.success("(Demo) Persona agregada — no se guardó");
      return;
    }

    setPending(true);
    try {
      const res = await fetch(
        apiUrl(`/api/branches/${activeBranch.id}/members`),
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId: Number(linkAccountId) }),
        },
      );
      const body = (await res.json().catch(() => null)) as {
        message?: string;
        team?: TeamMember[];
      } | null;
      if (!res.ok) {
        toast.danger(body?.message ?? "No se pudo vincular");
        return;
      }
      toast.success(
        available.find((a) => String(a.id) === linkAccountId)?.currentBranchName
          ? "Persona traída a este local"
          : "Persona agregada al local",
      );
      applyTeamUpdate(body?.team ?? []);
      await loadTeam(activeBranch.id);
      void fetchBranches();
    } catch {
      toast.danger("Error al vincular");
    } finally {
      setPending(false);
    }
  };

  const askUnlink = (member: TeamMember) => {
    if (teamTourDemoRef.current) {
      setTeam((prev) => prev.filter((m) => m.id !== member.id));
      toast.success("(Demo) Persona quitada — no se guardó");
      return;
    }
    setPendingConfirm({
      kind: "unlink",
      accountId: member.id,
      name: member.name,
    });
    confirmModal.open();
  };

  const askSetManager = (member: TeamMember) => {
    if (teamTourDemoRef.current) {
      if (member.isManager) {
        setTeam((prev) =>
          prev.map((m) => ({ ...m, isManager: false })),
        );
        setManagerAccountId(null);
        toast.success("(Demo) Encargado quitado — no se guardó");
        return;
      }
      setTeam((prev) =>
        prev.map((m) => ({
          ...m,
          isManager: m.id === member.id,
        })),
      );
      setManagerAccountId(member.id);
      toast.success("(Demo) Encargado actualizado — no se guardó");
      return;
    }
    if (member.isManager) {
      setPendingConfirm({
        kind: "clear-manager",
        accountId: member.id,
        name: member.name,
      });
      confirmModal.open();
      return;
    }
    if (!canBeManager(member)) {
      toast.danger(
        "El encargado debe ser Administrador (o Dueña). Cámbialo en Cuentas.",
      );
      return;
    }
    const previous =
      team.find((t) => t.isManager && t.id !== member.id)?.name ??
      (managerAccountId && managerAccountId !== member.id
        ? managerName
        : null);
    setPendingConfirm({
      kind: "manager",
      accountId: member.id,
      name: member.name,
      previousName: previous,
    });
    confirmModal.open();
  };

  const askMove = (member: TeamMember) => {
    if (!activeBranch) return;
    const toBranchId = Number(moveTargetByMember[member.id] || 0);
    if (!toBranchId) {
      toast.danger("Elige el local destino");
      return;
    }

    if (teamTourDemoRef.current) {
      setTeam((prev) => prev.filter((m) => m.id !== member.id));
      setMovePanelId(null);
      setMoveTargetByMember((prev) => {
        const next = { ...prev };
        delete next[member.id];
        return next;
      });
      const destName =
        otherBranches.find((b) => b.id === toBranchId)?.name ?? "otro local";
      toast.success(`(Demo) Traslado a «${destName}» — no se guardó`);
      return;
    }

    const destName =
      otherBranches.find((b) => b.id === toBranchId)?.name ?? "otro local";
    setPendingConfirm({
      kind: "move",
      accountId: member.id,
      name: member.name,
      toBranchId,
      destName,
    });
    confirmModal.open();
  };

  const handleUnlink = async (accountId: number) => {
    if (!activeBranch) return;
    setPending(true);
    try {
      const res = await fetch(
        apiUrl(
          `/api/branches/${activeBranch.id}/members?accountId=${accountId}`,
        ),
        { method: "DELETE", credentials: "include" },
      );
      const body = (await res.json().catch(() => null)) as {
        message?: string;
        team?: TeamMember[];
      } | null;
      if (!res.ok) {
        toast.danger(body?.message ?? "No se pudo desvincular");
        return;
      }
      toast.success("Persona desvinculada");
      applyTeamUpdate(body?.team ?? []);
      await loadTeam(activeBranch.id);
      confirmModal.close();
      setPendingConfirm(null);
    } catch {
      toast.danger("Error al desvincular");
    } finally {
      setPending(false);
    }
  };

  const handleSetManager = async (accountId: number | null) => {
    if (!activeBranch) return;
    setPending(true);
    try {
      const res = await fetch(
        apiUrl(`/api/branches/${activeBranch.id}/members`),
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ managerAccountId: accountId }),
        },
      );
      const body = (await res.json().catch(() => null)) as {
        message?: string;
        team?: TeamMember[];
        managerAccountId?: number | null;
      } | null;
      if (!res.ok) {
        toast.danger(body?.message ?? "No se pudo actualizar el encargado");
        return;
      }
      toast.success(
        accountId
          ? "Encargado principal actualizado"
          : "Sin encargado principal",
      );
      applyTeamUpdate(body?.team ?? [], body?.managerAccountId ?? null);
      confirmModal.close();
      setPendingConfirm(null);
    } catch {
      toast.danger("Error al guardar el encargado");
    } finally {
      setPending(false);
    }
  };

  const handleMove = async (
    accountId: number,
    toBranchId: number,
    destName: string,
  ) => {
    if (!activeBranch) return;
    setPending(true);
    try {
      const res = await fetch(
        apiUrl(`/api/branches/${activeBranch.id}/members`),
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "move",
            accountId,
            toBranchId,
          }),
        },
      );
      const body = (await res.json().catch(() => null)) as {
        message?: string;
        team?: TeamMember[];
        movedTo?: { name: string };
      } | null;
      if (!res.ok) {
        toast.danger(body?.message ?? "No se pudo mover");
        return;
      }
      toast.success(`Movida a ${body?.movedTo?.name ?? destName}`);
      applyTeamUpdate(body?.team ?? []);
      await loadTeam(activeBranch.id);
      void fetchBranches();
      confirmModal.close();
      setPendingConfirm(null);
    } catch {
      toast.danger("Error al mover");
    } finally {
      setPending(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!pendingConfirm) return;
    if (pendingConfirm.kind === "unlink") {
      await handleUnlink(pendingConfirm.accountId);
      return;
    }
    if (pendingConfirm.kind === "manager") {
      await handleSetManager(pendingConfirm.accountId);
      return;
    }
    if (pendingConfirm.kind === "clear-manager") {
      await handleSetManager(null);
      return;
    }
    await handleMove(
      pendingConfirm.accountId,
      pendingConfirm.toBranchId,
      pendingConfirm.destName,
    );
  };

  const managerName = useMemo(() => {
    if (!managerAccountId) return null;
    return team.find((m) => m.id === managerAccountId)?.name ?? null;
  }, [managerAccountId, team]);

  const canBeManager = (m: TeamMember) => {
    const r = m.role;
    return isOwnerRole(r) || isBranchAdminRole(r) || /admin|encargado/i.test(r);
  };

  const iconTip = (label: string, child: ReactNode) => (
    <Tooltip delay={300}>
      {child}
      <Tooltip.Content>{label}</Tooltip.Content>
    </Tooltip>
  );

  return (
    <BranchesTutorialProvider
      openTeamModal={openTeamForTour}
      closeTeamModal={closeTeamForTour}
      prepareTeamTour={prepareTeamTour}
      cleanupTeamTour={cleanupTeamTour}
      prepareOverviewTour={prepareOverviewTour}
      cleanupOverviewTour={cleanupOverviewTour}
      openCreateForm={openCreate}
      resetCreateFormTour={resetCreateFormTour}
      canManageTeam={isOwner && branches.length > 0}
      enabled={isOwner}
      onRunningChange={setTourRunning}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <PageHeader
          icon={<House width={24} height={24} />}
          title="Sucursales"
          description={
            isOwner
              ? "Crea locales, vincula gente y elige quién es el encargado principal de cada uno. La Dueña controla todo el negocio; el encargado manda en ese local."
              : "Tu local asignado. Solo ves la operación de esta sucursal."
          }
          action={
            isOwner ? (
              <div className="flex items-center gap-2">
                <BranchesOverviewHelpButton />
                {displayBranches.length > 0 ? (
                  <Button
                    variant="secondary"
                    onPress={() => openTeam(displayBranches[0]!)}
                    data-tour="branches-team-btn"
                  >
                    <Persons width={14} height={14} />
                    Gestionar equipos
                  </Button>
                ) : null}
                <Button
                  variant="primary"
                  onPress={openCreate}
                  data-tour="branches-create"
                >
                  <Plus width={16} height={16} />
                  Nuevo local
                </Button>
              </div>
            ) : undefined
          }
        />

      {loading && tourBranchesOverride === null ? (
        <div className="h-32 animate-pulse rounded-2xl bg-surface-secondary" />
      ) : displayBranches.length === 0 ? (
        <div data-tour="branches-empty">
          <ContentCard>
            <EmptyState
              icon={<House width={40} height={40} />}
              title={isOwner ? "Sin locales" : "Sin local asignado"}
              description={
                isOwner
                  ? "Crea el primer local del negocio."
                  : "Pide a la Dueña que te vincule desde Sucursales."
              }
              actionLabel={isOwner ? "Nuevo local" : undefined}
              onAction={isOwner ? openCreate : undefined}
            />
          </ContentCard>
        </div>
      ) : (
        <ul
          className="grid gap-4"
          style={{
            gridTemplateColumns: `repeat(${Math.min(displayBranches.length, 4)}, minmax(0, 1fr))`,
          }}
          data-tour="branches-list"
        >
          {displayBranches.map((b, idx) => {
            const lead =
              b.team?.find((m) => m.isManager) ??
              (b.managerAccountId
                ? b.team?.find((m) => m.id === b.managerAccountId)
                : null);
            return (
              <li
                key={b.id}
                className="rounded-2xl border border-separator bg-surface p-5"
                data-tour={idx === 0 ? "branches-card" : undefined}
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

                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  <span>
                    Equipo:{" "}
                    <span className="font-medium">{b.teamCount ?? 0}</span>
                  </span>
                  {lead ? (
                    <Chip color="warning" variant="soft" size="sm">
                      Encargado: {lead.name}
                    </Chip>
                  ) : isOwner ? (
                    <span className="text-xs text-muted">
                      Sin encargado principal
                    </span>
                  ) : null}
                </div>

                {isOwner && b.team && b.team.length > 0 ? (
                  <ul className="mt-3 flex flex-col gap-2 border-t border-separator pt-3">
                    {b.team.slice(0, 4).map((m) => (
                      <li
                        key={m.id}
                        className="flex flex-wrap items-center justify-between gap-2 text-sm"
                      >
                        <span>
                          <span className="font-medium">{m.name}</span>
                          <span className="text-muted"> · @{m.username}</span>
                        </span>
                        <div className="flex items-center gap-1">
                          {m.isManager ? (
                            <Chip color="warning" variant="soft" size="sm">
                              Encargado
                            </Chip>
                          ) : null}
                          <Chip
                            color={
                              isBranchAdminRole(m.role) || isOwnerRole(m.role)
                                ? "warning"
                                : "default"
                            }
                            variant="soft"
                            size="sm"
                          >
                            {roleDisplayLabel(m.role)}
                          </Chip>
                        </div>
                      </li>
                    ))}
                    {b.team.length > 4 ? (
                      <li className="text-xs text-muted">
                        +{b.team.length - 4} más…
                      </li>
                    ) : null}
                  </ul>
                ) : null}

                {isOwner ? (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onPress={() => openTeam(b)}
                    >
                      <Persons width={14} height={14} />
                      Ver equipo
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {isOwner ? (
        <Modal state={createModal}>
          <Modal.Backdrop isDismissable={!tourRunning}>
            <Modal.Container placement="center">
              <Modal.Dialog className={ENTITY_MODAL_DIALOG_CLASS}>
                {!tourRunning ? <Modal.CloseTrigger /> : null}
                <Modal.Header className={ENTITY_MODAL_HEADER_CLASS}>
                  <Modal.Icon>
                    <House width={20} height={20} />
                  </Modal.Icon>
                  <Modal.Heading>Nuevo local</Modal.Heading>
                  <div className="ml-auto">
                    <BranchesFormHelpButton />
                  </div>
                </Modal.Header>
                <Modal.Body className={ENTITY_MODAL_BODY_CLASS}>
                  <form
                    id="branch-form"
                    className={ENTITY_FORM_CLASS}
                    onSubmit={(e) => {
                      e.preventDefault();
                      void handleCreate();
                    }}
                  >
                    <div
                      className="flex flex-col gap-1"
                      data-tour="branches-form-name"
                    >
                      <Label>Nombre</Label>
                      <Input
                        placeholder="Andrea Guerrero · Nuevo local"
                        value={form.name}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, name: e.target.value }))
                        }
                      />
                    </div>
                    <div
                      className="flex flex-col gap-1"
                      data-tour="branches-form-address"
                    >
                      <Label>Dirección</Label>
                      <Input
                        placeholder="Calle y referencia, Loja"
                        value={form.address}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, address: e.target.value }))
                        }
                      />
                    </div>
                    <div
                      className="flex flex-col gap-1"
                      data-tour="branches-form-phone"
                    >
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
                  <Button
                    variant="secondary"
                    isDisabled={tourRunning}
                    onPress={() => createModal.close()}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    form="branch-form"
                    variant="primary"
                    isDisabled={pending}
                    data-tour="branches-form-submit"
                  >
                    {pending ? "Creando..." : "Crear local"}
                  </Button>
                </Modal.Footer>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      ) : null}

      {isOwner && activeBranch ? (
        <Modal state={teamModal}>
          <Modal.Backdrop isDismissable={!tourRunning}>
            <Modal.Container
              placement="center"
              size="lg"
              className="w-[min(96vw,72rem)] !max-w-[72rem]"
            >
              <Modal.Dialog className="max-h-[92vh] w-full !max-w-[72rem] overflow-hidden">
                {!tourRunning ? <Modal.CloseTrigger /> : null}
                <Modal.Header className="flex flex-col gap-3">
                  <div className="flex w-full items-start gap-3 pr-8">
                    <Modal.Icon>
                      <Persons width={20} height={20} />
                    </Modal.Icon>
                    <div className="min-w-0 flex-1">
                      <Modal.Heading>Equipos por local</Modal.Heading>
                      <p className="mt-1 text-xs text-muted">
                        Elige la pestaña del local para agregar, quitar o
                        trasladar personal.
                      </p>
                    </div>
                    <BranchesTeamHelpButton inModal />
                  </div>

                  <div
                    className="flex w-full gap-1 overflow-x-auto rounded-xl border border-separator bg-surface-secondary p-1"
                    role="tablist"
                    aria-label="Locales"
                    data-tour="branches-team-tabs"
                  >
                    {branches.map((b) => {
                      const selected = activeBranch.id === b.id;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          role="tab"
                          aria-selected={selected}
                          onClick={() => selectBranchTab(b.id)}
                          className={`min-w-0 flex-1 truncate rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                            selected
                              ? "bg-accent text-accent-foreground shadow-sm"
                              : "text-muted hover:bg-surface hover:text-foreground"
                          }`}
                        >
                          <span className="truncate">
                            {formatBranchLabel(
                              b.name,
                              b.isMain,
                              b.locationKind,
                            )}
                          </span>
                          <span
                            className={`ml-1.5 inline-flex rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                              selected
                                ? "bg-accent-foreground/20 text-accent-foreground"
                                : "bg-surface text-muted"
                            }`}
                          >
                            {b.teamCount ?? 0}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </Modal.Header>
                <Modal.Body className="flex max-h-[calc(92vh-10rem)] flex-col gap-4 overflow-y-auto">
                  <div data-tour="branches-team-manager">
                    {managerName ? (
                      <div className="flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-sm">
                        <CrownDiamond width={16} height={16} />
                        Encargado de{" "}
                        <span className="font-semibold">{activeBranch.name}</span>
                        : <span className="font-semibold">{managerName}</span>
                      </div>
                    ) : (
                      <p className="text-xs text-warning">
                        Aún no hay encargado principal en{" "}
                        <strong>{activeBranch.name}</strong>.
                      </p>
                    )}
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
                    <section
                      className="flex flex-col gap-2 rounded-xl border border-separator bg-surface-secondary/30 p-3"
                      data-tour="branches-team-add"
                    >
                      <h3 className="text-sm font-semibold">
                        Agregar a {activeBranch.name}
                      </h3>
                      <p className="text-xs text-muted">
                        Primero aparecen quienes{" "}
                        <strong>no tienen local</strong>. Si eliges a alguien de
                        otro local, se <strong>trae aquí</strong>.
                      </p>
                      <div className="flex flex-col gap-2">
                        <div data-tour="branches-team-add-select">
                          <SearchableSelect
                            label="Persona"
                            aria-label="Agregar cuenta"
                            placeholder={
                              teamLoading ? "Cargando…" : "Buscar persona…"
                            }
                            selectedKey={linkAccountId || null}
                            onSelectionChange={(key) =>
                              setLinkAccountId(key ?? "")
                            }
                            isDisabled={teamLoading || pending}
                            emptyMessage="No hay más personas para agregar"
                            options={available.map((a) => ({
                              id: String(a.id),
                              label: `${a.name} · @${a.username}`,
                              textValue: `${a.name} ${a.username} ${a.role} ${a.currentBranchName ?? "sin local"}`,
                              description: `${roleDisplayLabel(a.role)}${
                                a.unlinked || !a.currentBranchName
                                  ? " · Sin local"
                                  : ` · En: ${a.currentBranchName}`
                              }`,
                            }))}
                          />
                        </div>
                        <Button
                          variant="primary"
                          isDisabled={pending || !linkAccountId || teamLoading}
                          onPress={() => void handleLink()}
                          data-tour="branches-team-add-btn"
                        >
                          <Plus width={14} height={14} />
                          Agregar a este local
                        </Button>
                      </div>
                      {!teamLoading && available.length === 0 ? (
                        <p className="text-[11px] text-muted">
                          Todas las cuentas activas ya están en este local, o no
                          hay otras cuentas. Crea más en Cuentas o trasládalas
                          desde la lista de la derecha.
                        </p>
                      ) : null}
                      {available.filter(
                        (a) => a.unlinked || !a.currentBranchName,
                      ).length > 0 ? (
                        <p className="text-[11px] text-muted">
                          {
                            available.filter(
                              (a) => a.unlinked || !a.currentBranchName,
                            ).length
                          }{" "}
                          cuenta(s) sin local listas para vincular.
                        </p>
                      ) : null}
                    </section>

                    <section
                      className="flex flex-col gap-2"
                      data-tour="branches-team-list"
                    >
                      <h3 className="text-sm font-semibold">
                        En este local ({team.length})
                      </h3>
                      {teamLoading ? (
                        <div className="h-24 animate-pulse rounded-xl bg-surface-secondary" />
                      ) : team.length === 0 ? (
                        <p className="text-sm text-muted">
                          Nadie vinculado todavía. Agrégalos desde la izquierda.
                        </p>
                      ) : (
                        <ul className="flex flex-col gap-2 pr-1">
                          {team.map((m) => {
                            const moveOpen = movePanelId === m.id;
                            return (
                              <li
                                key={m.id}
                                className="flex flex-col gap-2 rounded-xl border border-separator px-3 py-2.5 text-sm"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="font-medium">
                                      {m.name}{" "}
                                      <span className="font-normal text-muted">
                                        @{m.username}
                                      </span>
                                    </p>
                                    <div className="mt-1 flex flex-wrap gap-1">
                                      <Chip
                                        color={
                                          canBeManager(m)
                                            ? "warning"
                                            : "default"
                                        }
                                        variant="soft"
                                        size="sm"
                                      >
                                        {roleDisplayLabel(m.role)}
                                      </Chip>
                                      {m.isManager ? (
                                        <Chip
                                          color="accent"
                                          variant="soft"
                                          size="sm"
                                        >
                                          Encargado
                                        </Chip>
                                      ) : null}
                                      {!m.isActive ? (
                                        <Chip
                                          color="default"
                                          variant="soft"
                                          size="sm"
                                        >
                                          Inactiva
                                        </Chip>
                                      ) : null}
                                    </div>
                                  </div>

                                  <div className="flex shrink-0 items-center gap-0.5">
                                    {canBeManager(m)
                                      ? iconTip(
                                          m.isManager
                                            ? "Encargado actual (clic para quitar)"
                                            : "Poner como encargado",
                                          <Button
                                            isIconOnly
                                            size="sm"
                                            variant={
                                              m.isManager ? "primary" : "ghost"
                                            }
                                            aria-label={
                                              m.isManager
                                                ? "Quitar encargado"
                                                : "Poner como encargado"
                                            }
                                            isDisabled={pending}
                                            onPress={() => askSetManager(m)}
                                          >
                                            <CrownDiamond
                                              width={16}
                                              height={16}
                                            />
                                          </Button>,
                                        )
                                      : null}

                                    {otherBranches.length > 0
                                      ? iconTip(
                                          moveOpen
                                            ? "Cerrar traslado"
                                            : "Trasladar a otro local",
                                          <Button
                                            isIconOnly
                                            size="sm"
                                            variant={
                                              moveOpen ? "secondary" : "ghost"
                                            }
                                            aria-label="Trasladar a otro local"
                                            isDisabled={pending}
                                            data-tour={
                                              team[0]?.id === m.id
                                                ? "branches-team-move"
                                                : undefined
                                            }
                                            onPress={() =>
                                              setMovePanelId((prev) =>
                                                prev === m.id ? null : m.id,
                                              )
                                            }
                                          >
                                            <ArrowRightArrowLeft
                                              width={16}
                                              height={16}
                                            />
                                          </Button>,
                                        )
                                      : null}

                                    {iconTip(
                                      "Quitar del local",
                                      <Button
                                        isIconOnly
                                        size="sm"
                                        variant="danger"
                                        aria-label="Quitar del local"
                                        isDisabled={pending}
                                        onPress={() => askUnlink(m)}
                                      >
                                        <Xmark width={16} height={16} />
                                      </Button>,
                                    )}
                                  </div>
                                </div>

                                {moveOpen && otherBranches.length > 0 ? (
                                  <div
                                    className="flex flex-col gap-2 border-t border-separator pt-2 sm:flex-row sm:items-end"
                                    data-tour={
                                      team[0]?.id === m.id
                                        ? "branches-team-move-panel"
                                        : undefined
                                    }
                                  >
                                    <div className="min-w-0 flex-1">
                                      <SelectField
                                        label="Local destino"
                                        placeholder="Elegir local…"
                                        selectedKey={
                                          moveTargetByMember[m.id] || null
                                        }
                                        onSelectionChange={(key) =>
                                          setMoveTargetByMember((prev) => ({
                                            ...prev,
                                            [m.id]: key ?? "",
                                          }))
                                        }
                                        options={otherBranches.map((ob) => ({
                                          id: String(ob.id),
                                          label: ob.name,
                                        }))}
                                        isDisabled={pending}
                                      />
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="primary"
                                      isDisabled={
                                        pending || !moveTargetByMember[m.id]
                                      }
                                      data-tour={
                                        team[0]?.id === m.id
                                          ? "branches-team-move-confirm"
                                          : undefined
                                      }
                                      onPress={() => askMove(m)}
                                    >
                                      Confirmar traslado
                                    </Button>
                                  </div>
                                ) : null}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                      {otherBranches.length === 0 ? (
                        <p
                          className="text-[11px] text-muted"
                          data-tour="branches-team-move"
                        >
                          Con más de un local verás el icono de traslado en cada
                          persona.
                        </p>
                      ) : null}
                    </section>
                  </div>
                </Modal.Body>
                <Modal.Footer>
                  <Button
                    variant="secondary"
                    isDisabled={tourRunning}
                    onPress={() => {
                      teamModal.close();
                      void fetchBranches();
                    }}
                  >
                    Cerrar
                  </Button>
                </Modal.Footer>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      ) : null}

      {pendingConfirm ? (
        <ConfirmDialog
          state={confirmModal}
          title={
            pendingConfirm.kind === "unlink"
              ? "Quitar del local"
              : pendingConfirm.kind === "move"
                ? "Trasladar persona"
                : pendingConfirm.kind === "clear-manager"
                  ? "Quitar encargado"
                  : "Cambiar encargado"
          }
          status={
            pendingConfirm.kind === "unlink" ||
            pendingConfirm.kind === "clear-manager"
              ? "danger"
              : "warning"
          }
          confirmVariant={
            pendingConfirm.kind === "unlink" ||
            pendingConfirm.kind === "clear-manager"
              ? "danger"
              : "primary"
          }
          confirmLabel={
            pendingConfirm.kind === "unlink"
              ? "Quitar"
              : pendingConfirm.kind === "move"
                ? "Trasladar"
                : pendingConfirm.kind === "clear-manager"
                  ? "Quitar encargado"
                  : "Poner encargado"
          }
          pending={pending}
          description={
            pendingConfirm.kind === "unlink" ? (
              <p>
                ¿Quitar a <strong>{pendingConfirm.name}</strong> de{" "}
                <strong>{activeBranch?.name}</strong>? Quedará sin local
                asignado.
              </p>
            ) : pendingConfirm.kind === "move" ? (
              <p>
                ¿Trasladar a <strong>{pendingConfirm.name}</strong> a{" "}
                <strong>{pendingConfirm.destName}</strong>? Dejará de estar en{" "}
                <strong>{activeBranch?.name}</strong>.
              </p>
            ) : pendingConfirm.kind === "clear-manager" ? (
              <p>
                ¿Quitar el rol de encargado a{" "}
                <strong>{pendingConfirm.name}</strong> en{" "}
                <strong>{activeBranch?.name}</strong>?
              </p>
            ) : pendingConfirm.previousName ? (
              <p>
                ¿Está seguro que quiere poner de encargado a{" "}
                <strong>{pendingConfirm.name}</strong>? Se quitará lo de
                encargado para <strong>{pendingConfirm.previousName}</strong>.
              </p>
            ) : (
              <p>
                ¿Poner de encargado a <strong>{pendingConfirm.name}</strong> en{" "}
                <strong>{activeBranch?.name}</strong>?
              </p>
            )
          }
          onConfirm={() => void handleConfirmAction()}
        />
      ) : null}
      </div>
    </BranchesTutorialProvider>
  );
}
