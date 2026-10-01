import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { loadCatalog, type Catalog, type Note } from "@/lib/catalog";
import {
  createCollection,
  deleteCollection,
  initCollections,
  mergeItems,
  renameCollection,
  setActive,
  setCurrency,
  useCollections,
} from "@/lib/collection";
import {
  grantPermission,
  loadFilesFallback,
  pickImageFolder,
  restoreImageFolder,
  supportsDirPicker,
  useImageSource,
} from "@/lib/images";
import { exportCsv, exportJson, parseImport } from "@/lib/io";
import { NoteTable, type SortKey } from "@/components/gablota/NoteTable";
import { NoteGallery } from "@/components/gablota/NoteGallery";
import { DetailPanel } from "@/components/gablota/DetailPanel";
import { Lightbox } from "@/components/gablota/Lightbox";
import { EditDialog, ExtraDialog } from "@/components/gablota/Dialogs";
import { applyUserData, initUserData, useUserData } from "@/lib/userdata";
import "@fontsource-variable/manrope";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/600.css";


type StatusFilter = "all" | "owned" | "wanted" | "missing";
const fmt = (n: number) => n.toLocaleString("pl-PL", { maximumFractionDigits: 2 });

export function App() {
  const [cat, setCat] = useState<Catalog | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const q = useDeferredValue(query.trim().toLowerCase());
  const [countryQ, setCountryQ] = useState("");
  const [country, setCountry] = useState<number | null>(null);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortKey>("default");
  const [view, setView] = useState<"list" | "gallery">("list");
  const [sel, setSel] = useState(0);
  const [lightbox, setLightbox] = useState<"front" | "back" | null>(null);
  const [cols, setCols] = useState(3);
  const [menu, setMenu] = useState<string | null>(null);
  const [dlg, setDlg] = useState<"edit" | "extra" | null>(null);
  const ud = useUserData();
  const [toast, setToast] = useState<string | null>(null);
  const importMode = useRef<"merge" | "new">("merge");
  const fileRef = useRef<HTMLInputElement>(null);
  const dirRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const cols_ = useCollections();
  const col = cols_.collections[cols_.active];
  const items = col?.items ?? {};
  const imgSrc = useImageSource();

  useEffect(() => {
    initCollections();
    initUserData();
    restoreImageFolder();
    loadCatalog().then(setCat, (e) => setErr(String(e)));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = useMemo(() => {
    if (!cat) return [] as Note[];
    let r = applyUserData(cat.notes, cat.countries, ud);
    if (country != null) r = r.filter((n) => n.c === country);
    if (status === "owned") r = r.filter((n) => items[n.key]?.status === "owned");
    else if (status === "wanted") r = r.filter((n) => items[n.key]?.status === "wanted");
    else if (status === "missing") r = r.filter((n) => items[n.key]?.status !== "owned");
    if (q) {
      const terms = q.split(/\s+/);
      r = r.filter((n) => terms.every((t) => n.hay.includes(t)));
    }
    if (sort !== "default") {
      r = [...r];
      const cmp: Record<string, (a: Note, b: Note) => number> = {
        country: (a, b) => a.country.localeCompare(b.country) || a.i - b.i,
        pick: (a, b) => a.pick.localeCompare(b.pick, undefined, { numeric: true }),
        nom: (a, b) => a.nomNum - b.nomNum,
        date: (a, b) => a.date.localeCompare(b.date, undefined, { numeric: true }),
        value: (a, b) => (items[b.key]?.value ?? -1) - (items[a.key]?.value ?? -1),
      };
      r.sort(cmp[sort]);
    }
    return r;
  }, [cat, country, status, q, sort, items, ud]);

  useEffect(() => setSel(0), [country, status, q, sort]);
  const note = filtered[Math.min(sel, filtered.length - 1)] ?? null;

  const summary = useMemo(() => {
    let owned = 0, wanted = 0, buy = 0, value = 0;
    const cs = new Set<string>();
    for (const [k, it] of Object.entries(items)) {
      if (it.status === "owned") {
        owned += it.qty || 1;
        buy += (it.buy ?? 0) * (it.qty || 1);
        value += (it.value ?? 0) * (it.qty || 1);
        cs.add(k.split("|")[0] ?? "");
      } else wanted++;
    }
    return { owned, wanted, buy, value, profit: value - buy, countries: cs.size };
  }, [items]);

  const countryList = useMemo(() => {
    if (!cat) return [];
    const t = countryQ.trim().toLowerCase();
    return cat.countries.map((c, i) => ({ ...c, i })).filter((c) => !t || c.name.toLowerCase().includes(t));
  }, [cat, countryQ]);

  const move = useCallback((d: number) => setSel((s) => Math.max(0, Math.min(filtered.length - 1, s + d))), [filtered.length]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (lightbox || dlg) return;
      const t = e.target as HTMLElement;
      if (e.key === "/" && t.tagName !== "INPUT" && t.tagName !== "TEXTAREA") {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) {
        if (e.key === "Escape" || (e.key === "ArrowDown" && t === searchRef.current)) t.blur();
        else return;
      }
      const step = view === "gallery" ? cols : 1;
      const map: Record<string, number> = {
        ArrowDown: step,
        ArrowUp: -step,
        PageDown: step * 12,
        PageUp: -step * 12,
        ...(view === "gallery" ? { ArrowRight: 1, ArrowLeft: -1 } : {}),
      };
      if (e.key in map) {
        e.preventDefault();
        move(map[e.key] ?? 0);
      } else if (e.key === "Home") (e.preventDefault(), setSel(0));
      else if (e.key === "End") (e.preventDefault(), setSel(filtered.length - 1));
      else if (e.key === "Enter" || e.key === " ") (e.preventDefault(), note && setLightbox("front"));
      else if (view === "list" && e.key === "ArrowRight") (e.preventDefault(), note && setLightbox("front"));
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [dlg, lightbox, view, cols, move, filtered.length, note]);

  const doImport = async (f: File) => {
    try {
      const { name, items: inc } = await parseImport(f);
      const n = Object.keys(inc).length;
      if (importMode.current === "new") createCollection(name, inc);
      else mergeItems(inc);
      setToast(`Zaimportowano ${n} pozycji${importMode.current === "new" ? ` jako „${name}”` : ""}`);
    } catch (e) {
      setToast(`Błąd importu: ${(e as Error).message}`);
    }
  };

  const chooseImages = async () => {
    setMenu(null);
    if (supportsDirPicker()) {
      try {
        await pickImageFolder();
        setToast("Folder ze zdjęciami podłączony");
      } catch {}
    } else dirRef.current?.click();
  };

  if (err) return <div className="grid h-screen place-items-center text-destructive">Nie udało się wczytać katalogu: {err}</div>;

  return (
    <div className="flex h-screen flex-col overflow-hidden" onClick={() => menu && setMenu(null)}>
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-line bg-ink/80 px-4">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-2xl font-semibold tracking-tight text-brass-2">Gablota</span>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground xl:inline">katalog banknotów</span>
        </div>

        <div className="flex max-w-xl flex-1 items-center gap-2 rounded-full border border-line bg-espresso px-4 py-1.5">
          <span className="text-muted-foreground">⌕</span>
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Szukaj: kraj, Pick, nominał, rok, emitent, motyw…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
          />
          {query && <button className="text-muted-foreground hover:text-cream" onClick={() => setQuery("")}>×</button>}
          <kbd className="rounded border border-line px-1.5 font-mono text-[10px] text-muted-foreground">/</kbd>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <select className="field w-44 py-1.5 font-mono text-[11px]" value={cols_.active} onChange={(e) => setActive(e.target.value)} title="Aktywna kolekcja">
            {Object.values(cols_.collections).map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({Object.keys(c.items).length})</option>
            ))}
          </select>

          <Menu id="col" open={menu} setOpen={setMenu} label="Kolekcja ▾">
            <MenuItem onClick={() => { const n = prompt("Nazwa nowej kolekcji:"); if (n) createCollection(n); }}>Nowa kolekcja</MenuItem>
            <MenuItem onClick={() => { const n = prompt("Nowa nazwa:", col?.name); if (n && col) renameCollection(col.id, n); }}>Zmień nazwę</MenuItem>
            <MenuItem onClick={() => { const c = prompt("Waluta wartości (np. zł, €, $):", cols_.currency); if (c) setCurrency(c); }}>Waluta: {cols_.currency}</MenuItem>
            <MenuItem danger onClick={() => col && confirm(`Usunąć kolekcję „${col.name}”?`) && deleteCollection(col.id)}>Usuń kolekcję</MenuItem>
          </Menu>

          <Menu id="io" open={menu} setOpen={setMenu} label="Import / Eksport ▾">
            <MenuItem onClick={() => col && exportJson(col)}>Eksport kolekcji (.json)</MenuItem>
            <MenuItem onClick={() => col && exportCsv(col, cat)}>Eksport do Excela (.csv)</MenuItem>
            <div className="my-1 h-px bg-line" />
            <MenuItem onClick={() => { importMode.current = "merge"; fileRef.current?.click(); }}>Importuj do bieżącej kolekcji</MenuItem>
            <MenuItem onClick={() => { importMode.current = "new"; fileRef.current?.click(); }}>Importuj jako nową (np. od kolegi)</MenuItem>
          </Menu>

          {imgSrc.kind === "needs-permission" ? (
            <button className="btn btn-brass" onClick={() => grantPermission()}>Zezwól na zdjęcia</button>
          ) : (
            <button className={`btn ${imgSrc.kind === "none" ? "btn-brass" : ""}`} onClick={chooseImages} title="Wskaż folder images (z podfolderami krajów)">
              {imgSrc.kind === "none" ? "Podłącz zdjęcia" : `Zdjęcia: ${imgSrc.name}`}
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept=".json,.csv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) doImport(f); e.target.value = ""; }} />
        <input
          ref={dirRef}
          type="file"
          hidden
          // @ts-expect-error non-standard attribute
          webkitdirectory=""
          multiple
          onChange={(e) => { if (e.target.files?.length) { loadFilesFallback(e.target.files); setToast("Zdjęcia wczytane"); } }}
        />
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[230px_minmax(0,1fr)_360px] gap-3 p-3 xl:grid-cols-[240px_minmax(0,1fr)_400px] 2xl:grid-cols-[270px_minmax(0,1fr)_480px]">
        {/* Left */}
        <aside className="flex min-h-0 flex-col gap-3">
          <div className="panel flex min-h-0 flex-1 flex-col p-2">
            <div className="flex items-center justify-between px-2 pb-2 pt-1">
              <span className="label-mono">Kraje · {cat?.countries.length ?? "…"}</span>
            </div>
            <input className="field mb-2" placeholder="Filtruj kraje…" value={countryQ} onChange={(e) => setCountryQ(e.target.value)} />
            <div className="min-h-0 flex-1 overflow-y-auto pr-1 text-[13px]">
              <CountryBtn active={country == null} onClick={() => setCountry(null)} name="Wszystkie kraje" count={cat?.notes.length} />
              {countryList.map((c) => (
                <CountryBtn key={c.i} active={country === c.i} onClick={() => setCountry(c.i)} name={c.name} count={c.count} />
              ))}
            </div>
          </div>

          <div className="panel p-3">
            <p className="label-mono mb-2">Pokaż</p>
            <div className="grid grid-cols-2 gap-1.5">
              {([
                ["all", "Wszystkie"],
                ["owned", `Posiadam`],
                ["wanted", `Poszukuję`],
                ["missing", "Brakujące"],
              ] as [StatusFilter, string][]).map(([k, l]) => (
                <button key={k} onClick={() => setStatus(k)} className={`btn justify-center ${status === k ? "btn-brass" : ""}`}>{l}</button>
              ))}
            </div>
          </div>

          <div className="panel p-4">
            <div className="flex items-baseline justify-between">
              <p className="label-mono">Wartość kolekcji</p>
              <span className="font-mono text-[10px] text-muted-foreground">{cols_.currency}</span>
            </div>
            <p className="mt-1 font-display text-4xl leading-none tracking-tight text-brass-2">{fmt(summary.value)}</p>
            <dl className="mt-3 space-y-1.5 font-mono text-[12px]">
              <SumRow k="Posiadam (szt.)" v={fmt(summary.owned)} />
              <SumRow k="Poszukuję" v={fmt(summary.wanted)} accent />
              <SumRow k="Kraje" v={fmt(summary.countries)} />
              <SumRow k="Koszt zakupu" v={fmt(summary.buy)} />
              <SumRow k="Zysk / strata" v={`${summary.profit >= 0 ? "+" : ""}${fmt(summary.profit)}`} accent />
            </dl>
          </div>
        </aside>

        {/* Center */}
        <main className="flex min-h-0 flex-col gap-2">
          <div className="flex items-center gap-3 px-1">
            <h1 className="font-display text-xl">
              {country != null && cat ? cat.countries[country]?.name : "Katalog"}
            </h1>
            <span className="font-mono text-[11px] text-muted-foreground">
              {cat ? `${fmt(filtered.length)} banknotów` : "Wczytywanie katalogu…"}
              {filtered.length > 0 && ` · ${fmt(sel + 1)} / ${fmt(filtered.length)}`}
            </span>
            <div className="ml-auto flex items-center gap-3">
              <span className="hidden font-mono text-[10px] text-muted-foreground lg:inline">
                {view === "list" ? "↑ ↓ przewijanie · Enter/→ powiększ" : "← → ↑ ↓ przewijanie · Enter powiększ"}
              </span>
              <div className="flex rounded-lg border border-line p-0.5">
                {(["list", "gallery"] as const).map((v) => (
                  <button key={v} onClick={() => setView(v)} className={`rounded-md px-3 py-1 font-mono text-[11px] ${view === v ? "bg-brass text-ink" : "text-muted-foreground hover:text-cream"}`}>
                    {v === "list" ? "Lista" : "Galeria"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="min-h-0 flex-1">
            {!cat ? (
              <div className="panel grid h-full place-items-center">
                <div className="text-center">
                  <p className="font-display text-3xl text-brass-2">Otwieram gablotę…</p>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">wczytuję 75 000 banknotów</p>
                </div>
              </div>
            ) : view === "list" ? (
              <NoteTable notes={filtered} items={items} sel={sel} onSelect={setSel} onOpen={(i) => (setSel(i), setLightbox("front"))} sort={sort} onSort={setSort} showThumbs={imgSrc.kind === "handle" || imgSrc.kind === "files"} />
            ) : (
              <NoteGallery notes={filtered} items={items} sel={sel} onSelect={setSel} onOpen={(i) => (setSel(i), setLightbox("front"))} onCols={setCols} />
            )}
          </div>
        </main>

        {/* Right */}
        <aside className="min-h-0">
          <DetailPanel note={note} item={note ? items[note.key] : undefined} currency={cols_.currency} onZoom={setLightbox} onEdit={() => setDlg("edit")} onExtra={() => setDlg("extra")} />
        </aside>
      </div>

      {lightbox && note && (
        <Lightbox
          note={note}
          initialSide={lightbox}
          index={sel}
          total={filtered.length}
          onClose={() => setLightbox(null)}
          onPrev={() => move(-1)}
          onNext={() => move(1)}
        />
      )}

      {dlg === "edit" && note && <EditDialog note={note} onClose={() => setDlg(null)} />}
      {dlg === "extra" && note && <ExtraDialog note={note} text={ud.extra[note.key] ?? ""} onClose={() => setDlg(null)} />}
      {toast && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-brass/40 bg-espresso-2 px-4 py-2 font-mono text-[12px] text-brass-2 shadow-2xl animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}
    </div>
  );
}

function CountryBtn({ active, onClick, name, count }: { active: boolean; onClick: () => void; name: string; count?: number | undefined }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left ${active ? "border border-brass/30 bg-espresso-2 text-brass-2" : "border border-transparent text-muted-foreground hover:bg-espresso hover:text-cream"}`}
    >
      <span className="truncate">{name}</span>
      <span className="font-mono text-[10px] opacity-70">{count?.toLocaleString("pl-PL")}</span>
    </button>
  );
}

function SumRow({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className={accent ? "text-brass-2" : "text-cream"}>{v}</dd>
    </div>
  );
}

function Menu({ id, open, setOpen, label, children }: { id: string; open: string | null; setOpen: (s: string | null) => void; label: string; children: React.ReactNode }) {
  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button className="btn" onClick={() => setOpen(open === id ? null : id)}>{label}</button>
      {open === id && (
        <div className="absolute right-0 top-full z-40 mt-1 w-64 rounded-lg border border-line bg-popover p-1 shadow-2xl animate-in fade-in zoom-in-95" onClick={() => setOpen(null)}>
          {children}
        </div>
      )}
    </div>
  );
}

function MenuItem({ onClick, children, danger }: { onClick: () => void; children: React.ReactNode; danger?: boolean }) {
  return (
    <button onClick={onClick} className={`block w-full rounded-md px-3 py-2 text-left text-[13px] hover:bg-espresso ${danger ? "text-destructive" : "text-cream"}`}>
      {children}
    </button>
  );
}
