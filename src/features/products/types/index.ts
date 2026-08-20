export interface ProductCategory {
  id: number;
  name: string;
}

export type ProductTypeKind = "raw" | "intermediate" | "final";

export interface Product {
  id: number;
  name: string;
  desc?: string | null;
  type?: ProductTypeKind | string | null;
  price: number;
  supplierPrice?: number | null;
  distributorPrice?: number | null;
  stock: number;
  minStock?: number | null;
  sku?: string | null;
  barcode?: string | null;
  taxRate?: number | null;
  primaryImageUrl?: string | null;
  categoryId?: number | null;
  category?: ProductCategory | null;
}
