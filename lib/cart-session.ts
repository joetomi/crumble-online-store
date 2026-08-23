import type { CartSession } from "./types";

const CART_KEY = "crumble_cart_session_v1";

function normalizeCartSession(session: CartSession): CartSession {
  const boxes = Array.isArray(session.boxes) ? [...session.boxes] : [];
  if (!boxes.length && session.boxItems?.length && session.activeBoxId) {
    boxes.push({ id: `legacy-${session.activeBoxId}`, boxId: session.activeBoxId, items: session.boxItems });
  }
  const quantities = session.quantities && typeof session.quantities === "object" ? session.quantities : {};
  const hasPieces = Object.values(quantities).some((quantity) => quantity > 0);
  return {
    mode: hasPieces && boxes.length ? "mixed" : boxes.length ? "box" : "pieces",
    quantities,
    boxes,
  };
}

export function saveCartSession(session: CartSession) {
  if (typeof window === "undefined") return;
  try {
    const normalized = normalizeCartSession(session);
    sessionStorage.setItem(CART_KEY, JSON.stringify(normalized));
    localStorage.setItem(CART_KEY, JSON.stringify(normalized));
  } catch (e) {
    console.error("Failed to save cart session", e);
  }
}

export function loadCartSession(): CartSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CART_KEY) || localStorage.getItem(CART_KEY);
    if (!raw) return null;
    return normalizeCartSession(JSON.parse(raw) as CartSession);
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
