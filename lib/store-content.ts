import defaultContentJson from "@/data/store.json";
import type { StoreContent } from "@/lib/types";
import { normalizeAllowedCookieTypes, normalizeCookieType } from "@/lib/types";

export const CONTENT_STORAGE_KEY = "crumble-store-content-v1";

export const defaultContent = defaultContentJson as StoreContent;

function normalizeContent(content: StoreContent): StoreContent {
  const defaultsById = new Map(defaultContent.products.map((product) => [product.id, product]));
  const currency = typeof content.store?.currency === "string" && content.store.currency.trim()
    ? content.store.currency.trim()
    : defaultContent.store.currency || "د.ل";

  return {
    ...content,
    version: Math.max(content.version ?? 1, defaultContent.version),
    store: {
      ...defaultContent.store,
      ...content.store,
      currency,
    },
    stories: content.stories?.length ? content.stories : defaultContent.stories,
    boxes: content.boxes.map((box) => ({
      ...box,
      allowedCookieTypes: normalizeAllowedCookieTypes(box.allowedCookieTypes),
    })),
    products: content.products.map((product) => {
      const fallback = defaultsById.get(product.id);
      const usesLegacyImage = product.image.startsWith("/products/");
      const normalized = { ...product, cookieType: normalizeCookieType(product.cookieType) };
      return usesLegacyImage && fallback ? { ...normalized, image: fallback.image } : normalized;
    }),
  };
}

export function readLocalContent(): StoreContent {
  if (typeof window === "undefined") return defaultContent;

  try {
    const value = window.localStorage.getItem(CONTENT_STORAGE_KEY);
    return value ? normalizeContent(JSON.parse(value) as StoreContent) : defaultContent;
  } catch {
    return defaultContent;
  }
}

export function writeLocalContent(content: StoreContent) {
  window.localStorage.setItem(CONTENT_STORAGE_KEY, JSON.stringify(content));
  window.dispatchEvent(new Event("crumble-content-updated"));
}

export function clearLocalContent() {
  window.localStorage.removeItem(CONTENT_STORAGE_KEY);
  window.dispatchEvent(new Event("crumble-content-updated"));
}

export function validateContent(value: unknown): value is StoreContent {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<StoreContent>;
  return Boolean(
      data.brand &&
      data.store &&
      typeof data.store.currency === "string" &&
      Boolean(data.store.currency.trim()) &&
      (data.stories === undefined || Array.isArray(data.stories)) &&
      Array.isArray(data.products) &&
      Array.isArray(data.boxes) &&
      data.products.every((product) => product.id && product.name && product.image) &&
      data.boxes.every((box) => box.id && box.name && box.capacity > 0),
  );
}
