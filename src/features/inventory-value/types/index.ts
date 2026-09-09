export type InventoryCostSource = "catalog" | "purchase" | "none";

export type InventoryValueItem = {
  id: number;
  name: string;
  sku: string | null;
  category: string | null;
  unit: string | null;
  stock: number;
  unitCost: number;
  salePrice: number;
  valueCost: number;
  valueSale: number;
  margin: number;
  costSource: InventoryCostSource;
  hasStock: boolean;
  missingCost: boolean;
};

export type InventoryValueSummary = {
  productCount: number;
  withStockCount: number;
  missingCostCount: number;
  totalValueCost: number;
  totalValueSale: number;
  totalMargin: number;
};

export type InventoryValueResponse = {
  summary: InventoryValueSummary;
  items: InventoryValueItem[];
};
