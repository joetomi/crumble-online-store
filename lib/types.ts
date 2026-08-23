export type OrderMode = "pieces" | "box" | "mixed";

export const COOKIE_TYPES = ["mini", "classic", "crumble"] as const;
export type CookieType = (typeof COOKIE_TYPES)[number];

export const COOKIE_TYPE_LABELS: Record<CookieType, string> = {
  mini: "ميني",
  classic: "كلاسيك",
  crumble: "كرمبل",
};

export function normalizeCookieType(value: unknown): CookieType {
  return COOKIE_TYPES.includes(value as CookieType) ? value as CookieType : "crumble";
}

export function normalizeAllowedCookieTypes(value: unknown): CookieType[] {
  if (!Array.isArray(value)) return [...COOKIE_TYPES];
  const normalized = [...new Set(value.filter((item): item is CookieType => COOKIE_TYPES.includes(item as CookieType)))];
  return normalized.length ? normalized : [...COOKIE_TYPES];
}

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
  cookieType: CookieType;
};

export type BoxSize = {
  id: string;
  name: string;
  capacity: number;
  price: number;
  enabled: boolean;
  description: string;
  allowedCookieTypes: CookieType[];
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

export type CartBox = {
  id: string;
  boxId: string;
  items: string[];
};

export type CartSession = {
  mode: OrderMode;
  quantities: Record<string, number>;
  boxes?: CartBox[];
  /** Legacy single-box fields kept only so older saved carts can be migrated. */
  boxItems?: string[];
  activeBoxId?: string;
};

export type Customer = {
  name: string;
  phone: string;
  city: string;
  locationDescription?: string;
};

export type PaymentMethod = "cash" | "bank_transfer";

export type OrderPayload = {
  mode: OrderMode;
  customer: Customer;
  items: Array<{ id: string; name: string; quantity: number; price: number | null }>;
  box?: { id: string; name: string; price: number; capacity: number };
  boxes?: Array<{ id: string; name: string; price: number; capacity: number; items: OrderPayload["items"] }>;
  totalPieces: number;
  totalPrice: number | null;
  paymentMethod: PaymentMethod;
};
