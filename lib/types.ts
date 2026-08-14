export type Product = {
  id: string;
  name: string;
  description: string;
  image: string;
  price: number | null;
  available: boolean;
  category: string;
  variant: string;
  accent: string;
};

export type BoxSize = {
  id: string;
  name: string;
  capacity: number;
  price: number;
  enabled: boolean;
  description: string;
};

export type StoreContent = {
  version: number;
  brand: {
    name: string;
    slogan: string;
    heroTitle: string;
    heroText: string;
    logo: string;
    linerImage: string;
  };
  store: {
    orderingEnabled: boolean;
    openingTime: string;
    closingTime: string;
    timezone: string;
    closedMessage: string;
    closedDescription: string;
    currency: string;
    cities: string[];
    social: Record<"instagram" | "facebook" | "tiktok", string>;
  };
  boxes: BoxSize[];
  products: Product[];
};

export type OrderMode = "pieces" | "box";

export type Customer = {
  name: string;
  phone: string;
  city: string;
};

export type OrderPayload = {
  mode: OrderMode;
  customer: Customer;
  items: Array<{ id: string; name: string; quantity: number; price: number | null }>;
  box?: { id: string; name: string; price: number; capacity: number };
  totalPieces: number;
  totalPrice: number | null;
};
