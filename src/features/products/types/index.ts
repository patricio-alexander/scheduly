export interface ProductCategory {
  id: number;
  name: string;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  categoryId?: number | null;
  category?: ProductCategory | null;
}
