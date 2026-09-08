export interface Unit {
  id: number;
  name: string;
  abbreviation: string;
  description: string | null;
  factor: number;
  productsCount?: number;
}
