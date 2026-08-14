import defaultContentJson from "@/data/store.json";
import type { StoreContent } from "@/lib/types";

export const CONTENT_STORAGE_KEY = "crumble-store-content-v1";

export const defaultContent = defaultContentJson as StoreContent;

export function readLocalContent(): StoreContent {
  if (typeof window === "undefined") return defaultContent;

  try {
    const value = window.localStorage.getItem(CONTENT_STORAGE_KEY);
    return value ? (JSON.parse(value) as StoreContent) : defaultContent;
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
      Array.isArray(data.products) &&
      Array.isArray(data.boxes) &&
      data.products.every((product) => product.id && product.name && product.image) &&
      data.boxes.every((box) => box.id && box.name && box.capacity > 0),
  );
}
