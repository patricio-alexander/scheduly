export interface Customer {
  id: number;
  name: string;
  lastnames: string;
  phone: string;
  email: string;
  identificationType?: string | null;
  identification?: string | null;
  address?: string;
  hasPortalAccess?: boolean;
}
