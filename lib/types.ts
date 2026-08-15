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

export type Story = {
  id: string;
  title?: string;
  titleAr?: string;
  titleEn?: string;
  caption?: string;
  captionAr?: string;
  captionEn?: string;
  image: string;
  postUrl?: string;
  enabled: boolean;
};

export type CityOption = {
  id: string;
  name: string;
  deliveryFee: number;
  estimatedTime: string;
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
    cities: (string | CityOption)[];
    social: Record<"instagram" | "facebook" | "tiktok", string>;
  };
  stories?: Story[];
  boxes: BoxSize[];
  products: Product[];
};

export function normalizeCities(cities: (string | CityOption)[] = []): CityOption[] {
  return cities.map((item, index) => {
    if (typeof item === "string") {
      return {
        id: `city-${index}-${item}`,
        name: item,
        deliveryFee: 10,
        estimatedTime: "خلال 24 - 48 ساعة",
      };
    }
    return item;
  });
}

export type CartSession = {
  mode: OrderMode;
  quantities: Record<string, number>;
  boxItems: string[];
  activeBoxId: string;
};

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
