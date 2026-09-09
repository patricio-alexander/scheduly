import { navModules, type NavItem, type NavModule } from "@/shared/components/nav-config";
import {
  hasEmployeeExperience,
  isBranchAdminRole,
  isManagementRole,
  isOwnerRole,
  isProgrammerRole,
  isPureEmployeeRole,
  mapExternalRoleName,
  roleLabel,
  type AppRole,
} from "@/shared/utils/roles";

export type NavVisibilityOpts = {
  isOwner: boolean;
  isManagement: boolean;
  isBranchAdmin: boolean;
  isPureEmployee: boolean;
  showEmployeeExperience: boolean;
  isProgrammer: boolean;
};

export function navVisibilityFromRole(
  role: string | null | undefined,
): NavVisibilityOpts {
  return {
    isOwner: isOwnerRole(role),
    isManagement: isManagementRole(role),
    isBranchAdmin: isBranchAdminRole(role),
    isPureEmployee: isPureEmployeeRole(role),
    showEmployeeExperience: hasEmployeeExperience(role),
    isProgrammer: isProgrammerRole(role),
  };
}

/** Misma lógica que el Sidebar: módulos/ítems visibles según rol. */
export function filterVisibleModules(
  modules: NavModule[],
  opts: NavVisibilityOpts,
): NavModule[] {
  const {
    isOwner,
    isManagement,
    isBranchAdmin,
    isPureEmployee,
    showEmployeeExperience,
    isProgrammer,
  } = opts;

  if (isProgrammer) {
    const home = modules.filter((mod) => mod.id === "home");
    const system = modules
      .filter((mod) => mod.programmerOnly)
      .map((mod) => ({
        ...mod,
        items: mod.items.filter((item) => item.programmerOnly),
      }))
      .filter((mod) => mod.items.length > 0);
    return [...home, ...system];
  }

  return modules
    .filter(
      (mod) =>
        !mod.programmerOnly &&
        (!mod.ownerOnly || isOwner) &&
        (!mod.adminOnly || isManagement) &&
        (!mod.employeeExperienceOnly || showEmployeeExperience),
    )
    .map((mod) => ({
      ...mod,
      items: mod.items.filter(
        (item) =>
          !item.programmerOnly &&
          (!item.ownerOnly || isOwner) &&
          (!item.adminOnly || isManagement) &&
          (!item.branchAdminOnly || isBranchAdmin) &&
          (!item.employeeOnly || isPureEmployee) &&
          (!item.employeeExperienceOnly || showEmployeeExperience),
      ),
    }))
    .filter((mod) => mod.items.length > 0);
}

export function getVisibleNavModules(
  role: string | null | undefined,
): NavModule[] {
  return filterVisibleModules(navModules, navVisibilityFromRole(role));
}

export function navItemLabelForRole(
  item: NavItem,
  role: string | null | undefined,
): string {
  if (isPureEmployeeRole(role) && item.employeeLabel) return item.employeeLabel;
  if (isBranchAdminRole(role) && item.branchAdminLabel) {
    return item.branchAdminLabel;
  }
  return item.label;
}

export function appRoleOf(role: string | null | undefined): AppRole {
  return mapExternalRoleName(role);
}

export function roleTitle(role: string | null | undefined): string {
  return roleLabel(role);
}
