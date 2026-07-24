export interface NotificationItem {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  /** Ruta interna opcional (ej. producto con stock bajo) */
  link: string | null;
  createdAt: string;
}
