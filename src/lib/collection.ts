import { useSyncExternalStore } from "react";

export type Status = "owned" | "wanted";
export type Item = {
  status: Status;
  qty: number;
  condition: string;
  buy: number | null;
  value: number | null;
  notes: string;
  updated: number;
};
export type Collection = { id: string; name: string; items: Record<string, Item> };
type State = { active: string; collections: Record<string, Collection>; currency: string };

const KEY = "gablota.collections.v1";
const uid = () => Math.random().toString(36).slice(2, 10);

let state: State = { active: "", collections: {}, currency: "zł" };
const subs = new Set<() => void>();
const emit = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
  subs.forEach((f) => f());
};

export function initCollections() {
  try {
    const s = localStorage.getItem(KEY);
    if (s) state = JSON.parse(s);
  } catch {}
  if (!Object.keys(state.collections).length) {
    const id = uid();
    state = { ...state, active: id, collections: { [id]: { id, name: "Moja kolekcja", items: {} } } };
  }
  if (!state.collections[state.active]) state.active = Object.keys(state.collections)[0]!;
  emit();
}

export function useCollections() {
  return useSyncExternalStore(
    (f) => (subs.add(f), () => subs.delete(f)),
    () => state,
    () => state,
  );
}

const setActiveItems = (fn: (items: Record<string, Item>) => Record<string, Item>) => {
  const c = state.collections[state.active];
  if (!c) return;
  state = { ...state, collections: { ...state.collections, [c.id]: { ...c, items: fn(c.items) } } };
  emit();
};

export const emptyItem = (status: Status): Item => ({
  status,
  qty: 1,
  condition: "",
  buy: null,
  value: null,
  notes: "",
  updated: Date.now(),
});

export function toggleStatus(key: string, status: Status) {
  setActiveItems((items) => {
    const cur = items[key];
    const next = { ...items };
    if (cur?.status === status) delete next[key];
    else next[key] = { ...(cur ?? emptyItem(status)), status, updated: Date.now() };
    return next;
  });
}

export function updateItem(key: string, patch: Partial<Item>) {
  setActiveItems((items) => ({
    ...items,
    [key]: { ...(items[key] ?? emptyItem("owned")), ...patch, updated: Date.now() },
  }));
}

export function mergeItems(incoming: Record<string, Item>) {
  setActiveItems((items) => ({ ...items, ...incoming }));
}

export function createCollection(name: string, items: Record<string, Item> = {}) {
  const id = uid();
  state = { ...state, active: id, collections: { ...state.collections, [id]: { id, name, items } } };
  emit();
}
export function setActive(id: string) {
  state = { ...state, active: id };
  emit();
}
export function renameCollection(id: string, name: string) {
  const c = state.collections[id];
  if (!c) return;
  state = { ...state, collections: { ...state.collections, [id]: { ...c, name } } };
  emit();
}
export function deleteCollection(id: string) {
  const cols = { ...state.collections };
  delete cols[id];
  state = { ...state, collections: cols };
  if (!Object.keys(cols).length) {
    state.collections = {};
    initCollections();
    return;
  }
  state.active = Object.keys(cols)[0]!;
  emit();
}
export function setCurrency(currency: string) {
  state = { ...state, currency };
  emit();
}
