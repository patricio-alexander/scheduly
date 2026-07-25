export interface Role {
  id: number;
  name: string;
  usersCount?: number;
  /** Rol del sistema (admin / employee): no editable ni eliminable */
  system?: boolean;
}
