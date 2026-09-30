import { useEffect } from "react";
import type { Note } from "@/lib/catalog";
import type { Item } from "@/lib/collection";
import { NoteImage } from "./NoteImage";
import { StatusBadge } from "./NoteTable";
import { useVirtual } from "./useVirtual";

export function galleryCols(width: number) {
  return Math.max(1, Math.floor((width - 16) / 250));
}

export function NoteGallery({
  notes,
  items,
  sel,
  onSelect,
  onOpen,
  onCols,
}: {
  notes: Note[];
  items: Record<string, Item>;
  sel: number;
  onSelect: (i: number) => void;
  onOpen: (i: number) => void;
  onCols: (c: number) => void;
}) {
  // compute layout from measured width (first pass uses default)
  const probe = useVirtual(0, 1);
  const cols = galleryCols(probe.size.w);
  const cardW = (probe.size.w - 16 - (cols - 1) * 12) / cols;
  const rowH = Math.round(cardW / 2 + 64);
  const rows = Math.ceil(notes.length / cols);
  const v = useVirtual(rows, rowH, 2);
  useEffect(() => onCols(cols), [cols, onCols]);
  useEffect(() => v.scrollToRow(Math.floor(sel / cols)), [sel, cols]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={probe.ref} className="panel h-full min-h-0 overflow-hidden">
      <div ref={v.ref} className="h-full overflow-y-auto p-2">
        <div style={{ height: v.total }} className="relative">
          {Array.from({ length: v.end - v.start }, (_, k) => {
            const r = v.start + k;
            return (
              <div key={r} className="absolute inset-x-0 flex gap-3" style={{ top: r * rowH, height: rowH - 12 }}>
                {notes.slice(r * cols, r * cols + cols).map((n, c) => {
                  const idx = r * cols + c;
                  const active = idx === sel;
                  return (
                    <div
                      key={n.i}
                      onClick={() => onSelect(idx)}
                      onDoubleClick={() => onOpen(idx)}
                      style={{ width: cardW }}
                      className={`cursor-pointer rounded-xl border p-2 transition ${active ? "border-brass/70 bg-brass/10" : "border-line bg-espresso/40 hover:border-brass/40"}`}
                    >
                      <NoteImage note={n} side="front" label={false} />
                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-[13px]">
                            {n.nom} {n.cur}
                          </p>
                          <p className="truncate font-mono text-[10px] text-muted-foreground">
                            {n.country} · {n.pick} · {n.date}
                          </p>
                        </div>
                        <StatusBadge item={items[n.key]} />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
