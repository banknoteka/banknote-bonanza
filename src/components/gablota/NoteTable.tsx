import { useEffect } from "react";
import type { Note } from "@/lib/catalog";
import type { Item } from "@/lib/collection";
import { NoteImage } from "./NoteImage";
import { useVirtual } from "./useVirtual";

const COLS = "grid-cols-[60px_minmax(90px,150px)_72px_minmax(120px,190px)_minmax(96px,150px)_minmax(0,1fr)_84px_70px]";
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
  useEffect(() => v.scrollToRow(sel), [sel]); // eslint-disable-line react-hooks/exhaustive-deps

  const Th = ({ k, children, right }: { k?: SortKey; children: React.ReactNode; right?: boolean }) => (
    <button
      disabled={!k}
      onClick={() => k && onSort(sort === k ? "default" : k)}
      className={`truncate text-left ${right ? "text-right" : ""} ${k ? "hover:text-cream" : ""} ${sort === k ? "text-brass-2" : ""}`}
    >
      {children}
      {sort === k && " ↓"}
    </button>
  );

  return (
    <div className="panel flex h-full min-h-0 flex-col overflow-hidden">
      <div className={`grid ${COLS} gap-2.5 border-b border-line px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground`}>
        <span>{showThumbs ? "Awers" : ""}</span>
        <Th k="country">Kraj</Th>
        <Th k="pick">Pick</Th>
        <Th k="nom">Nominał</Th>
        <Th k="date">Data emisji</Th>
        <Th>Emitent</Th>
        <Th>Status</Th>
        <Th k="value" right>Wartość</Th>
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
                style={{ top: idx * H, height: H }}
                className={`absolute inset-x-0 grid ${COLS} cursor-pointer items-center gap-2.5 border-b border-line/50 px-3 text-[13px] ${
                  active ? "bg-brass/12 shadow-[inset_2px_0_0_var(--brass)]" : "hover:bg-espresso-2/60"
                }`}
              >
                {showThumbs ? <NoteImage note={n} side="front" label={false} className="w-14 rounded" /> : <span className="font-mono text-[10px] text-muted-foreground/60">{idx + 1}</span>}
                <span className="truncate">{n.country}</span>
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
