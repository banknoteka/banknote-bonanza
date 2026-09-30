import { useEffect, useRef, useState } from "react";
import type { Note } from "@/lib/catalog";
import { useNoteImage } from "@/lib/images";

type Side = "front" | "back" | "both";

function Zoomable({ note, side, zoom, pan }: { note: Note; side: "front" | "back"; zoom: number; pan: { x: number; y: number } }) {
  const url = useNoteImage(note, side);
  return (
    <div className="relative aspect-[2/1] w-full max-h-full overflow-hidden rounded-xl ring-1 ring-brass/40 guilloche">
      <div
        className="absolute inset-0 grid place-items-center transition-transform duration-150"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
      >
        {url ? (
          <img src={url} alt="" draggable={false} className="h-full w-full select-none object-contain" />
        ) : (
          <span className="font-display text-7xl text-brass-2/70">{note.nom}</span>
        )}
      </div>
      <span className="absolute left-3 top-3 font-mono text-[10px] uppercase tracking-[0.2em] text-brass-2/80">
        {side === "front" ? "Awers" : "Rewers"}
      </span>
    </div>
  );
}

export function Lightbox({
  note,
  initialSide,
  index,
  total,
  onClose,
  onPrev,
  onNext,
}: {
  note: Note;
  initialSide: "front" | "back";
  index: number;
  total: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const [side, setSide] = useState<Side>(initialSide);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [note.i, side]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") (e.preventDefault(), onPrev());
      else if (e.key === "ArrowRight") (e.preventDefault(), onNext());
      else if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === " ")
        (e.preventDefault(), setSide((s) => (s === "front" ? "back" : s === "back" ? "both" : "front")));
      else if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(6, z + 0.5));
      else if (e.key === "-") setZoom((z) => Math.max(1, z - 0.5));
      else if (e.key === "0") (setZoom(1), setPan({ x: 0, y: 0 }));
    };
    window.addEventListener("keydown", h, true);
    return () => window.removeEventListener("keydown", h, true);
  }, [onClose, onPrev, onNext]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink/90 backdrop-blur-xl animate-in fade-in" onClick={onClose}>
      <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="min-w-0">
          <p className="label-mono text-brass">
            {note.country} · Pick {note.pick}
          </p>
          <h3 className="truncate font-display text-2xl">
            {note.nom} {note.cur} <span className="text-muted-foreground">· {note.date}</span>
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-line p-0.5">
            {(["front", "back", "both"] as Side[]).map((s) => (
              <button
                key={s}
                onClick={() => setSide(s)}
                className={`rounded-md px-3 py-1 font-mono text-[11px] ${side === s ? "bg-brass text-ink" : "text-muted-foreground hover:text-cream"}`}
              >
                {s === "front" ? "Awers" : s === "back" ? "Rewers" : "Obie"}
              </button>
            ))}
          </div>
          <button className="btn size-9 justify-center" onClick={() => setZoom((z) => Math.max(1, z - 0.5))} aria-label="Pomniejsz">−</button>
          <span className="w-12 text-center font-mono text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
          <button className="btn size-9 justify-center" onClick={() => setZoom((z) => Math.min(6, z + 0.5))} aria-label="Powiększ">+</button>
          <button className="btn ml-2" onClick={onClose}>Zamknij · Esc</button>
        </div>
      </div>

      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden px-20 py-6"
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => setZoom((z) => Math.min(6, Math.max(1, z - Math.sign(e.deltaY) * 0.25)))}
        onMouseDown={(e) => (drag.current = { x: e.clientX - pan.x, y: e.clientY - pan.y })}
        onMouseMove={(e) => drag.current && zoom > 1 && setPan({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y })}
        onMouseUp={() => (drag.current = null)}
        onMouseLeave={() => (drag.current = null)}
        style={{ cursor: zoom > 1 ? "grab" : "default" }}
      >
        <button className="btn absolute left-5 top-1/2 size-11 -translate-y-1/2 justify-center text-lg" onClick={onPrev} aria-label="Poprzedni">←</button>
        {side === "both" ? (
          <div className="grid w-full grid-cols-2 gap-6" style={{ maxWidth: "min(1800px, calc((100vh - 190px) * 4 + 24px))" }}>
            <Zoomable note={note} side="front" zoom={zoom} pan={pan} />
            <Zoomable note={note} side="back" zoom={zoom} pan={pan} />
          </div>
        ) : (
          <div className="w-full" style={{ maxWidth: "min(1800px, calc((100vh - 190px) * 2))" }}>
            <Zoomable note={note} side={side} zoom={zoom} pan={pan} />
          </div>
        )}
        <button className="btn absolute right-5 top-1/2 size-11 -translate-y-1/2 justify-center text-lg" onClick={onNext} aria-label="Następny">→</button>
      </div>

      <div className="flex items-center justify-between border-t border-line px-6 py-2.5 font-mono text-[11px] text-muted-foreground" onClick={(e) => e.stopPropagation()}>
        <span>← → poprzedni / następny · ↑ ↓ spacja: strona · + − kółko: zoom · 0 reset · przeciągnij, by przesunąć</span>
        <span>
          {index + 1} / {total.toLocaleString("pl-PL")}
        </span>
      </div>
    </div>
  );
}
