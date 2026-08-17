export type SriAuthorizationStatus = "authorized" | "rejected" | "processing" | "pending";

export function resolveSriAuthorizationStatus(
  status: string,
): SriAuthorizationStatus {
  if (status === "authorized") return "authorized";
  if (status === "rejected") return "rejected";
  if (status === "received") return "processing";
  return "pending";
}

export function sriStatusLabel(status: string): string {
  switch (resolveSriAuthorizationStatus(status)) {
    case "authorized":
      return "Autorizado SRI";
    case "rejected":
      return "Rechazado SRI";
    case "processing":
      return "En procesamiento SRI";
    default:
      return "Pendiente SRI";
  }
}

export function sriStatusBadgeClass(status: string): string {
  switch (resolveSriAuthorizationStatus(status)) {
    case "authorized":
      return "bg-success/15 text-success";
    case "rejected":
      return "bg-danger/15 text-danger";
    case "processing":
      return "bg-accent/15 text-accent";
    default:
      return "bg-warning/15 text-warning";
  }
}
