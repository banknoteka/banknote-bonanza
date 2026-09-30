import { useEffect, useState, useSyncExternalStore } from "react";

type Source =
  | { kind: "none" }
  | { kind: "needs-permission"; dir: FileSystemDirectoryHandle }
  | { kind: "handle"; dir: FileSystemDirectoryHandle; name: string }
  | { kind: "files"; map: Map<string, File>; name: string };

let source: Source = { kind: "none" };
let version = 0;
const subs = new Set<() => void>();
const urlCache = new Map<string, Promise<string | null>>();
const dirCache = new Map<string, Promise<FileSystemDirectoryHandle | null>>();

function set(s: Source) {
  source = s;
  version++;
  urlCache.forEach((p) => p.then((u) => u && URL.revokeObjectURL(u)));
  urlCache.clear();
  dirCache.clear();
  subs.forEach((f) => f());
}

export const useImageSource = () =>
  useSyncExternalStore(
    (f) => (subs.add(f), () => subs.delete(f)),
    () => source,
    () => source,
  );

// --- IndexedDB persistence of the folder handle
function idb<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => {
    const open = indexedDB.open("gablota", 1);
    open.onupgradeneeded = () => open.result.createObjectStore("kv");
    open.onsuccess = () => {
      const tx = open.result.transaction("kv", mode);
      const r = fn(tx.objectStore("kv"));
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    };
    open.onerror = () => rej(open.error);
  });
}

async function normalize(dir: FileSystemDirectoryHandle) {
  try {
    return await dir.getDirectoryHandle("images");
  } catch {
    return dir;
  }
}

export async function restoreImageFolder() {
  if (typeof indexedDB === "undefined") return;
  try {
    const dir = (await idb("readonly", (s) => s.get("imgdir"))) as FileSystemDirectoryHandle | undefined;
    if (!dir) return;
    // @ts-expect-error queryPermission is Chromium-only
    const p = await dir.queryPermission?.({ mode: "read" });
    if (p === "granted") set({ kind: "handle", dir: await normalize(dir), name: dir.name });
    else set({ kind: "needs-permission", dir });
  } catch {}
}

export async function grantPermission() {
  if (source.kind !== "needs-permission") return;
  const dir = source.dir;
  // @ts-expect-error Chromium-only
  const p = await dir.requestPermission?.({ mode: "read" });
  if (p === "granted") set({ kind: "handle", dir: await normalize(dir), name: dir.name });
}

export const supportsDirPicker = () => typeof window !== "undefined" && "showDirectoryPicker" in window;

export async function pickImageFolder() {
  // @ts-expect-error Chromium-only
  const dir: FileSystemDirectoryHandle = await window.showDirectoryPicker({ id: "gablota-images" });
  await idb("readwrite", (s) => s.put(dir, "imgdir"));
  set({ kind: "handle", dir: await normalize(dir), name: dir.name });
}

export function loadFilesFallback(files: FileList) {
  const map = new Map<string, File>();
  let root = "";
  for (const f of Array.from(files)) {
    const parts = (f.webkitRelativePath || f.name).split("/");
    root ||= parts[0] ?? "";
    if (parts.length >= 2) {
      const base = (parts[parts.length - 1] ?? "").replace(/\.[^.]+$/, "");
      map.set(`${parts[parts.length - 2]}/${base}`.toLowerCase(), f);
    }
  }
  set({ kind: "files", map, name: root });
}

const EXT = [".jpg", ".jpeg", ".JPG", ".JPEG", ".png", ".webp"];

async function resolve(folder: string, name: string): Promise<string | null> {
  const s = source;
  if (s.kind === "files") {
    const f = s.map.get(`${folder}/${name}`.toLowerCase());
    return f ? URL.createObjectURL(f) : null;
  }
  if (s.kind !== "handle") return null;
  let dp = dirCache.get(folder);
  if (!dp) {
    dp = s.dir.getDirectoryHandle(folder).catch(() => null);
    dirCache.set(folder, dp);
  }
  const d = await dp;
  if (!d) return null;
  for (const e of EXT) {
    try {
      const fh = await d.getFileHandle(name + e);
      return URL.createObjectURL(await fh.getFile());
    } catch {}
  }
  return null;
}

export function getImageUrl(folder: string, name?: string) {
  if (!name) return Promise.resolve(null);
  const k = `${folder}/${name}`;
  let p = urlCache.get(k);
  if (!p) {
    p = resolve(folder, name);
    urlCache.set(k, p);
  }
  return p;
}

export function useImage(folder: string, name?: string) {
  const src = useImageSource();
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setUrl(null);
    getImageUrl(folder, name).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [folder, name, src]);
  return url;
}

export const imageVersion = () => version;
