import type { CartSession } from "./types";

const CART_KEY = "crumble_cart_session_v1";

export function saveCartSession(session: CartSession) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(CART_KEY, JSON.stringify(session));
    localStorage.setItem(CART_KEY, JSON.stringify(session));
  } catch (e) {
    console.error("Failed to save cart session", e);
  }
}

export function loadCartSession(): CartSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CART_KEY) || localStorage.getItem(CART_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CartSession;
  } catch (e) {
    console.error("Failed to load cart session", e);
    return null;
  }
}

export function clearCartSession() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(CART_KEY);
    localStorage.removeItem(CART_KEY);
  } catch (e) {
    console.error("Failed to clear cart session", e);
  }
}
