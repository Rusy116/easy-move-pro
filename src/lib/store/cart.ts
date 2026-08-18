// ---------------------------------------------------------------------------
// Digital store — browser cart.
//
// Digital PDFs are single-quantity by nature, so the cart is a de-duplicated
// list of slugs plus display data. Prices shown from here are cosmetic: the
// server always re-reads the real price at checkout.
// ---------------------------------------------------------------------------
import { useCallback, useSyncExternalStore } from "react";

const KEY = "em_cart_v1";

export interface CartLine {
  slug: string;
  title: string;
  priceCents: number;
  coverUrl?: string | null;
}

let cache: CartLine[] | null = null;
const listeners = new Set<() => void>();

function read(): CartLine[] {
  if (cache) return cache;
  if (typeof window === "undefined") return (cache = []);
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as CartLine[]) : [];
    cache = Array.isArray(parsed)
      ? parsed.filter((l) => l && typeof l.slug === "string").slice(0, 10)
      : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: CartLine[]) {
  cache = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage full or blocked — the in-memory cart still works */
    }
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function addToCart(line: CartLine) {
  const current = read();
  if (current.some((l) => l.slug === line.slug)) return;
  write([...current, line].slice(0, 10));
}

export function removeFromCart(slug: string) {
  write(read().filter((l) => l.slug !== slug));
}

export function clearCart() {
  write([]);
}

export function cartTotal(lines: CartLine[]) {
  return lines.reduce((sum, l) => sum + Number(l.priceCents ?? 0), 0);
}

const EMPTY: CartLine[] = [];

/** Reactive cart contents. Returns an empty cart during SSR. */
export function useCart() {
  const lines = useSyncExternalStore(
    subscribe,
    () => read(),
    () => EMPTY,
  );

  const has = useCallback((slug: string) => lines.some((l) => l.slug === slug), [lines]);

  return {
    lines,
    count: lines.length,
    total: cartTotal(lines),
    has,
    add: addToCart,
    remove: removeFromCart,
    clear: clearCart,
  };
}
