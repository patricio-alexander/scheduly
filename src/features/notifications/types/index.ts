export interface NotificationItem {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  createdAt: string;
}
