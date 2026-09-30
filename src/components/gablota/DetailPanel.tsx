import type { Note } from "@/lib/catalog";
import { toggleStatus, updateItem, type Item } from "@/lib/collection";
import { NoteImage } from "./NoteImage";
import { toggleFavNote, useUserData } from "@/lib/userdata";

const Row = ({ k, v }: { k: string; v?: string }) =>
  v ? (
    <div className="grid grid-cols-[88px_1fr] gap-3 py-1">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-cream/90">{v}</dd>
    </div>
  ) : null;

const numVal = (s: string) => (s.trim() === "" ? null : parseFloat(s.replace(",", ".")) || 0);

export function DetailPanel({
  note,
  item,
  currency,
  onZoom,
  onEdit,
  onExtra,
}: {
  onEdit: () => void;
  onExtra: () => void;
  note: Note | null;
  item?: Item | undefined;
  currency: string;
  onZoom: (side: "front" | "back") => void;
}) {
  const ud = useUserData();
  if (!note)
    return (
      <div className="panel grid h-full place-items-center p-6 text-center text-sm text-muted-foreground">
        Wybierz banknot z listy
      </div>
    );
  const owned = item?.status === "owned";
  const wanted = item?.status === "wanted";
  return (
    <div className="panel flex h-full min-h-0 flex-col overflow-y-auto p-4">
      <div className="space-y-2">
        <NoteImage note={note} side="front" onClick={() => onZoom("front")} />
        <NoteImage note={note} side="back" onClick={() => onZoom("back")} />
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="label-mono text-brass">
            {note.country} · Pick {note.pick}
          </p>
          <h2 className="font-display text-2xl leading-tight">
            {note.nom} {note.cur}
          </h2>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button
            className={`btn size-9 justify-center text-base ${ud.favNotes[note.key] ? "btn-brass" : ""}`}
            title="Dodaj do ulubionych"
            onClick={() => toggleFavNote(note.key)}
          >{ud.favNotes[note.key] ? "★" : "☆"}</button>
          <button className="btn btn-brass" onClick={() => onZoom("front")}>Powiększ</button>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button className="btn justify-center" onClick={onEdit}>✎ Edytuj dane i zdjęcia</button>
        <button className={`btn justify-center ${ud.extra[note.key] ? "btn-brass" : ""}`} onClick={onExtra}>
          {ud.extra[note.key] ? "Opis dodatkowy ●" : "+ Opis dodatkowy"}
        </button>
      </div>
      {ud.extra[note.key] && (
        <button onClick={onExtra} className="mt-2 line-clamp-3 rounded-lg border border-brass/25 bg-brass/5 p-2.5 text-left text-[12.5px] text-cream/85 hover:border-brass/50">
          {ud.extra[note.key]}
        </button>
      )}

      <dl className="mt-2 text-[13px]">
        <Row k="Data" v={note.date} />
        <Row k="Emitent" v={note.iss} />
        <Row k="Awers" v={note.front} />
        <Row k="Rewers" v={note.back} />
        <Row k="Odmiana" v={note.variant} />
      </dl>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => toggleStatus(note.key, "owned")}
          className={`btn justify-center py-2 ${owned ? "border-owned/60 bg-owned/20 text-owned" : ""}`}
        >
          {owned ? "✓ Posiadam" : "Posiadam"}
        </button>
        <button
          onClick={() => toggleStatus(note.key, "wanted")}
          className={`btn justify-center py-2 ${wanted ? "border-wanted/60 bg-wanted/20 text-wanted" : ""}`}
        >
          {wanted ? "★ Poszukuję" : "Poszukuję"}
        </button>
      </div>

      {item && (
        <div className="mt-3 space-y-2 border-t border-line pt-3" key={note.key}>
          <div className="grid grid-cols-3 gap-2">
            <label className="space-y-1">
              <span className="label-mono">Ilość</span>
              <input className="field" type="number" min={1} defaultValue={item.qty} onBlur={(e) => updateItem(note.key, { qty: Math.max(1, +e.target.value || 1) })} />
            </label>
            <label className="col-span-2 space-y-1">
              <span className="label-mono">Stan</span>
              <select className="field" defaultValue={item.condition} onChange={(e) => updateItem(note.key, { condition: e.target.value })}>
                <option value="">—</option>
                {["UNC", "AU", "XF", "VF", "F", "VG", "G", "P"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1">
              <span className="label-mono">Cena zakupu ({currency})</span>
              <input className="field font-mono" inputMode="decimal" defaultValue={item.buy ?? ""} onBlur={(e) => updateItem(note.key, { buy: numVal(e.target.value) })} />
            </label>
            <label className="space-y-1">
              <span className="label-mono">Wartość ({currency})</span>
              <input className="field font-mono" inputMode="decimal" defaultValue={item.value ?? ""} onBlur={(e) => updateItem(note.key, { value: numVal(e.target.value) })} />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="label-mono">Mój opis / notatki</span>
            <textarea className="field min-h-20 resize-y" defaultValue={item.notes} onBlur={(e) => updateItem(note.key, { notes: e.target.value })} />
          </label>
        </div>
      )}
    </div>
  );
}
