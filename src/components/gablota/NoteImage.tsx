import type { Note } from "@/lib/catalog";
import { useImage } from "@/lib/images";
import { cn } from "@/lib/utils";

export function NoteImage({
  note,
  side,
  className,
  label = true,
  onClick,
}: {
  note: Note;
  side: "front" | "back";
  className?: string;
  label?: boolean;
  onClick?: () => void;
}) {
  const name = side === "front" ? note.imgFront : note.imgBack;
  const url = useImage(note.folder, name);
  return (
    <div
      onClick={onClick}
      className={cn(
        "relative aspect-[2/1] overflow-hidden rounded-lg ring-1 ring-brass/25 guilloche",
        onClick && "cursor-zoom-in transition hover:ring-brass/60",
        className,
      )}
    >
      {url ? (
        <img src={url} alt={`${note.country} ${note.nom} ${note.cur} – ${side === "front" ? "awers" : "rewers"}`} className="absolute inset-0 h-full w-full object-contain" draggable={false} />
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          <span className="font-display text-3xl text-brass-2/70">{note.nom || "—"}</span>
        </div>
      )}
      {label && (
        <span className="absolute left-2 top-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-brass-2/80 drop-shadow">
          {side === "front" ? "Awers" : "Rewers"}
        </span>
      )}
    </div>
  );
}
