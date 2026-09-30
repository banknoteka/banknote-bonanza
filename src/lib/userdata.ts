import { useSyncExternalStore } from "react";
import type { Note } from "./catalog";

/** Editable fields of a banknote. */
export const FIELDS = [
  ["country", "Kraj"],
  ["pick", "Pick"],
  ["nom", "Nominał"],
  ["cur", "Waluta"],
  ["date", "Data emisji"],
  ["iss", "Emitent"],
  ["front", "Opis awersu"],
  ["back", "Opis rewersu"],
  ["variant", "Odmiana"],
] as const;
export type FieldKey = (typeof FIELDS)[number][0];
export type NoteData = Record<FieldKey, string>;

type State = {
  edits: Record<string, Partial<NoteData>>; // original key -> overrides
  added: Record<string, NoteData>; // "new:<id>" -> full data
  deleted: Record<string, true>;
  favCountries: Record<string, true>;
  favNotes: Record<string, true>;
  extra: Record<string, string>; // popup description
};

const KEY = "gablota.user.v1";
let state: State = { edits: {}, added: {}, deleted: {}, favCountries: {}, favNotes: {}, extra: {} };
const subs = new Set<() => void>();
let listeners: (() => void)[] = [];
export const onUserChange = (f: () => void) => listeners.push(f);

const emit = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
  subs.forEach((f) => f());
  listeners.forEach((f) => f());
};

export function initUserData() {
  try {
    const s = localStorage.getItem(KEY);
    if (s) state = { ...state, ...JSON.parse(s) };
  } catch {}
  subs.forEach((f) => f());
}
export const getUserData = () => state;
export function replaceUserData(s: Partial<State>) {
  state = { ...state, ...s };
  emit();
}

export const useUserData = () =>
  useSyncExternalStore(
    (f) => (subs.add(f), () => subs.delete(f)),
    () => state,
    () => state,
  );

const toggle = (m: Record<string, true>, k: string) => {
  const n = { ...m };
  if (n[k]) delete n[k];
  else n[k] = true;
  return n;
};
export const toggleFavCountry = (name: string) => ((state = { ...state, favCountries: toggle(state.favCountries, name) }), emit());
export const toggleFavNote = (key: string) => ((state = { ...state, favNotes: toggle(state.favNotes, key) }), emit());

export function setExtra(key: string, text: string) {
  const extra = { ...state.extra };
  if (text.trim()) extra[key] = text;
  else delete extra[key];
  state = { ...state, extra };
  emit();
}

export function saveNote(key: string, data: NoteData, original?: NoteData) {
  if (key.startsWith("new:")) state = { ...state, added: { ...state.added, [key]: data } };
  else {
    const diff: Partial<NoteData> = {};
    for (const [k] of FIELDS) if (!original || data[k] !== original[k]) diff[k] = data[k];
    state = { ...state, edits: { ...state.edits, [key]: diff } };
  }
  emit();
}
export function addNote(data: NoteData) {
  const key = `new:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  state = { ...state, added: { ...state.added, [key]: data } };
  emit();
  return key;
}
export function removeNote(key: string) {
  if (key.startsWith("new:")) {
    const added = { ...state.added };
    delete added[key];
    state = { ...state, added };
  } else state = { ...state, deleted: { ...state.deleted, [key]: true } };
  emit();
}
export function resetNote(key: string) {
  const edits = { ...state.edits };
  delete edits[key];
  state = { ...state, edits };
  emit();
}

const hay = (d: NoteData) => Object.values(d).join(" ").toLowerCase();
const nomNum = (s: string) => parseFloat(s.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;

/** Apply user edits / additions / deletions on top of the base catalog. */
export function applyUserData(base: Note[], countries: { name: string; folder: string }[], s: State): Note[] {
  const out: Note[] = [];
  for (const n of base) {
    if (s.deleted[n.key]) continue;
    const e = s.edits[n.key];
    if (!e) {
      out.push(n);
      continue;
    }
    const d = { ...pickData(n), ...e };
    out.push({ ...n, ...d, hay: hay(d), nomNum: nomNum(d.nom), edited: true });
  }
  let i = base.length;
  for (const [key, d] of Object.entries(s.added)) {
    const ci = countries.findIndex((c) => c.name === d.country);
    out.push({
      ...d,
      i: i++,
      c: ci,
      folder: countries[ci]?.folder ?? d.country,
      files: [],
      key,
      hay: hay(d),
      nomNum: nomNum(d.nom),
      edited: true,
    });
  }
  return out;
}

export const pickData = (n: Note): NoteData =>
  Object.fromEntries(FIELDS.map(([k]) => [k, n[k] ?? ""])) as NoteData;
