type BranchEmission = {
  id?: number;
  code?: string | null;
  sortOrder?: number | null;
  position?: number | null;
  emissionEstablishment?: string | null;
  emissionPoint?: string | null;
  establishmentCode?: string | null;
  emissionPointCode?: string | null;
};

function pad3(value: string) {
  return value.padStart(3, "0").slice(-3);
}

export function resolveEmissionCodes(branch: BranchEmission) {
  const estabRaw =
    String(branch.establishmentCode ?? "").trim() ||
    String(branch.emissionEstablishment ?? "").trim() ||
    String(branch.sortOrder || branch.position || 1).padStart(3, "0");
  const ptoRaw =
    String(branch.emissionPointCode ?? "").trim() ||
    String(branch.emissionPoint ?? "").trim() ||
    "001";
  return {
    estab: pad3(estabRaw),
    ptoEmi: pad3(ptoRaw),
  };
}
