import type { Catalog } from "./catalog";
import { noteKey } from "./catalog";
import type { Collection, Item, Status } from "./collection";

function download(name: string, data: string, type: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([data], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

const safe = (s: string) => s.replace(/[^\p{L}\p{N}_-]+/gu, "_");

export function exportJson(col: Collection) {
  const data = { app: "gablota", version: 1, name: col.name, exported: new Date().toISOString(), items: col.items };
  download(`${safe(col.name)}.json`, JSON.stringify(data, null, 2), "application/json");
}

const HEAD = ["Kraj", "Pick", "Nominał", "Waluta", "Data", "Emitent", "Status", "Ilość", "Stan", "Cena zakupu", "Wartość", "Notatki"];
const q = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function exportCsv(col: Collection, cat: Catalog | null) {
  const byKey = new Map(cat?.notes.map((n) => [n.key, n]));
  const lines = [HEAD.join(";")];
  for (const [key, it] of Object.entries(col.items)) {
    const n = byKey.get(key);
    const [country = "", pick = ""] = key.split("|");
    lines.push(
      [country, pick, n?.nom, n?.cur, n?.date, n?.iss, it.status === "owned" ? "Posiadam" : "Poszukuję", it.qty, it.condition, it.buy, it.value, it.notes]
        .map(q)
        .join(";"),
    );
  }
  download(`${safe(col.name)}.csv`, "\uFEFF" + lines.join("\r\n"), "text/csv;charset=utf-8");
}

function parseCsv(text: string) {
  const sep = (text.split("\n")[0] ?? "").includes(";") ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [], cur = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"' && text[i + 1] === '"') (cur += '"'), i++;
      else if (ch === '"') inQ = false;
      else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === sep) row.push(cur), (cur = "");
    else if (ch === "\n") row.push(cur.replace(/\r$/, "")), rows.push(row), (row = []), (cur = "");
    else cur += ch;
  }
  if (cur || row.length) row.push(cur), rows.push(row);
  return rows;
}

const num = (s?: string) => {
  if (!s) return null;
  const v = parseFloat(s.replace(/\s/g, "").replace(",", "."));
  return isNaN(v) ? null : v;
};

export async function parseImport(file: File): Promise<{ name: string; items: Record<string, Item> }> {
  const text = (await file.text()).replace(/^\uFEFF/, "");
  const base = file.name.replace(/\.[^.]+$/, "");
  if (file.name.toLowerCase().endsWith(".json")) {
    const d = JSON.parse(text);
    if (!d.items) throw new Error("Nieprawidłowy plik kolekcji");
    return { name: d.name || base, items: d.items };
  }
  const [head = [], ...rows] = parseCsv(text);
  const idx = (n: string) => head.findIndex((h) => h.trim().toLowerCase() === n.toLowerCase());
  const I = Object.fromEntries(HEAD.map((h) => [h, idx(h)])) as Record<string, number>;
  const g = (r: string[], h: string) => { const j = I[h] ?? -1; return j >= 0 ? r[j] : undefined; };
  if ((I["Kraj"] ?? -1) < 0 || (I["Pick"] ?? -1) < 0) throw new Error("Plik CSV musi mieć kolumny „Kraj” i „Pick”");
  const items: Record<string, Item> = {};
  for (const r of rows) {
    const country = g(r, "Kraj")?.trim();
    const pick = g(r, "Pick")?.trim();
    if (!country || !pick) continue;
    const st = (g(r, "Status") ?? "").toLowerCase();
    const status: Status = st.startsWith("posz") || st === "wanted" ? "wanted" : "owned";
    items[noteKey(country, pick)] = {
      status,
      qty: num(g(r, "Ilość")) ?? 1,
      condition: g(r, "Stan") ?? "",
      buy: num(g(r, "Cena zakupu")),
      value: num(g(r, "Wartość")),
      notes: g(r, "Notatki") ?? "",
      updated: Date.now(),
    };
  }
  return { name: base, items };
}
