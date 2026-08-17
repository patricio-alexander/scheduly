type BranchEmission = {
  id: number;
  code: string;
  sortOrder: number;
  emissionEstablishment: string;
  emissionPoint: string;
};

export function resolveEmissionCodes(branch: BranchEmission) {
  const estab =
    branch.emissionEstablishment.trim() ||
    String(branch.sortOrder || 1).padStart(3, "0");
  const ptoEmi = branch.emissionPoint.trim() || "001";
  return {
    estab: estab.padStart(3, "0").slice(-3),
    ptoEmi: ptoEmi.padStart(3, "0").slice(-3),
  };
}
