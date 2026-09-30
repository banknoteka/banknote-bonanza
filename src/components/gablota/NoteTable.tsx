import { useEffect, useRef, useState } from "react";
import { toggleFavNote, useUserData } from "@/lib/userdata";
import type { Note } from "@/lib/catalog";
import type { Item } from "@/lib/collection";
import { NoteImage } from "./NoteImage";
import { useVirtual } from "./useVirtual";

const WKEY = "gablota.colwidths.v1";
// thumb, country, pick, nominal, date, issuer (flex), status, value
const DEFAULT_W = [64, 130, 72, 160, 120, 0, 86, 78];
const MIN_W = 40;
function loadW(): number[] {
  try {
    const w = JSON.parse(localStorage.getItem(WKEY) ?? "");
    if (Array.isArray(w) && w.length === DEFAULT_W.length) return w;
  } catch {}
  return DEFAULT_W;
}
const H = 46;

export type SortKey = "default" | "country" | "pick" | "nom" | "date" | "value";

export function StatusBadge({ item }: { item?: Item | undefined }) {
  if (!item) return <span className="text-muted-foreground/40">—</span>;
  return item.status === "owned" ? (
    <span className="rounded-full border border-owned/40 bg-owned/15 px-2 py-0.5 font-mono text-[10px] text-owned">Posiadam</span>
  ) : (
    <span className="rounded-full border border-wanted/40 bg-wanted/15 px-2 py-0.5 font-mono text-[10px] text-wanted">Poszukuję</span>
  );
}

export function NoteTable({
  notes,
  items,
  sel,
  onSelect,
  onOpen,
  sort,
  onSort,
  showThumbs,
}: {
  notes: Note[];
  items: Record<string, Item>;
  sel: number;
  onSelect: (i: number) => void;
  onOpen: (i: number) => void;
  sort: SortKey;
  onSort: (s: SortKey) => void;
  showThumbs: boolean;
}) {
  const v = useVirtual(notes.length, H);
  const ud = useUserData();
  const [w, setW] = useState(DEFAULT_W);
  useEffect(() => setW(loadW()), []);
  const wRef = useRef(w);
  wRef.current = w;
  const tpl = { gridTemplateColumns: w.map((x) => (x ? `${x}px` : "minmax(80px,1fr)")).join(" ") };
  const startResize = (i: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const x0 = e.clientX, w0 = wRef.current[i] ?? 100;
    const mv = (ev: PointerEvent) => setW((cur) => cur.map((x, j) => (j === i ? Math.max(MIN_W, Math.round(w0 + ev.clientX - x0)) : x)));
    const up = () => {
      window.removeEventListener("pointermove", mv);
      window.removeEventListener("pointerup", up);
      try { localStorage.setItem(WKEY, JSON.stringify(wRef.current)); } catch {}
    };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
  };
  const Rz = ({ i }: { i: number }) => (
    <span
      onPointerDown={startResize(i)}
      onDoubleClick={(e) => { e.stopPropagation(); setW((c) => c.map((x, j) => (j === i ? DEFAULT_W[i]! : x))); }}
      title="Przeciągnij, aby zmienić szerokość (dwuklik = domyślna)"
      className="absolute -right-2 top-0 z-10 h-full w-3 cursor-col-resize after:absolute after:left-1/2 after:top-0 after:h-full after:w-px after:bg-line hover:after:bg-brass"
    />
  );
  useEffect(() => v.scrollToRow(sel), [sel]); // eslint-disable-line react-hooks/exhaustive-deps

  const Th = ({ k, children, right, i }: { k?: SortKey; children: React.ReactNode; right?: boolean; i: number }) => (
    <div className="relative min-w-0">
    <button
      disabled={!k}
      onClick={() => k && onSort(sort === k ? "default" : k)}
      className={`block w-full truncate text-left ${right ? "text-right" : ""} ${k ? "hover:text-cream" : ""} ${sort === k ? "text-brass-2" : ""}`}
    >
      {children}
      {sort === k && " ↓"}
    </button>
    {w[i] ? <Rz i={i} /> : null}
    </div>
  );

  return (
    <div className="panel flex h-full min-h-0 flex-col overflow-hidden">
      <div style={tpl} className="grid gap-2.5 border-b border-line px-3 py-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        <Th i={0}>{showThumbs ? "Awers" : "★"}</Th>
        <Th i={1} k="country">Kraj</Th>
        <Th i={2} k="pick">Pick</Th>
        <Th i={3} k="nom">Nominał</Th>
        <Th i={4} k="date">Data emisji</Th>
        <Th i={5}>Emitent</Th>
        <Th i={6}>Status</Th>
        <Th i={7} k="value" right>Wartość</Th>
      </div>
      <div ref={v.ref} className="relative min-h-0 flex-1 overflow-y-auto" tabIndex={-1}>
        <div style={{ height: v.total }} className="relative">
          {notes.slice(v.start, v.end).map((n, k) => {
            const idx = v.start + k;
            const it = items[n.key];
            const active = idx === sel;
            return (
              <div
                key={n.i}
                onClick={() => onSelect(idx)}
                onDoubleClick={() => onOpen(idx)}
                style={{ ...tpl, top: idx * H, height: H }}
                className={`absolute inset-x-0 grid cursor-pointer items-center gap-2.5 border-b border-line/50 px-3 text-[13px] ${
                  active ? "bg-brass/12 shadow-[inset_2px_0_0_var(--brass)]" : "hover:bg-espresso-2/60"
                }`}
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <button
                    onClick={(e) => (e.stopPropagation(), toggleFavNote(n.key))}
                    title="Ulubiony"
                    className={`shrink-0 text-[14px] leading-none ${ud.favNotes[n.key] ? "text-brass-2" : "text-muted-foreground/30 hover:text-brass-2"}`}
                  >{ud.favNotes[n.key] ? "★" : "☆"}</button>
                  {showThumbs && <NoteImage note={n} side="front" label={false} className="min-w-0 flex-1 rounded" />}
                </span>
                <span className="truncate">{n.country}{ud.extra[n.key] && <span title="Ma opis dodatkowy" className="ml-1 text-brass">✎</span>}</span>
                <span className="truncate font-mono text-[12px] text-brass-2">{n.pick}</span>
                <span className="truncate" title={`${n.nom} ${n.cur}`}><span className="font-mono">{n.nom}</span> <span className="text-muted-foreground">{n.cur}</span></span>
                <span className="truncate font-mono text-[12px] text-muted-foreground" title={n.date}>{n.date}</span>
                <span className="truncate text-muted-foreground" title={n.iss}>{n.iss}</span>
                <span><StatusBadge item={it} /></span>
                <span className="text-right font-mono text-[12px] text-brass-2">{it?.value != null ? it.value.toLocaleString("pl-PL") : ""}</span>
              </div>
            );
          })}
        </div>
        {!notes.length && <p className="p-8 text-center text-sm text-muted-foreground">Brak banknotów dla wybranych filtrów.</p>}
      </div>
    </div>
  );
}
