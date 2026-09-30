import { useEffect, useState } from "react";
import type { Note } from "@/lib/catalog";
import { setCustomImage } from "@/lib/images";
import { FIELDS, addNote, pickData, removeNote, resetNote, saveNote, setExtra, type NoteData } from "@/lib/userdata";
import { NoteImage } from "./NoteImage";

function Modal({ title, onClose, children, wide }: { title: React.ReactNode; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h, true);
    return () => window.removeEventListener("keydown", h, true);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-ink/80 p-6 backdrop-blur-md animate-in fade-in" onMouseDown={onClose}>
      <div
        className={`panel flex max-h-full w-full flex-col overflow-hidden bg-espresso shadow-2xl animate-in zoom-in-95 ${wide ? "max-w-4xl" : "max-w-2xl"}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h3 className="font-display text-2xl">{title}</h3>
          <button className="btn" onClick={onClose}>Zamknij · Esc</button>
        </div>
        <div className="min-h-0 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

export function ExtraDialog({ note, text, onClose }: { note: Note; text: string; onClose: () => void }) {
  const [edit, setEdit] = useState(!text);
  const [val, setVal] = useState(text);
  return (
    <Modal title={<>Opis dodatkowy <span className="text-base text-muted-foreground">· {note.country} {note.nom} {note.cur} (Pick {note.pick})</span></>} onClose={onClose}>
      {edit ? (
        <textarea
          autoFocus
          className="field min-h-72 resize-y text-[14px] leading-relaxed"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="Historia banknotu, skąd pochodzi, uwagi o stanie, numer seryjny, podpisy…"
        />
      ) : (
        <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-cream/90">{text}</p>
      )}
      <div className="mt-4 flex justify-end gap-2">
        {edit ? (
          <>
            {text && <button className="btn" onClick={() => (setVal(text), setEdit(false))}>Anuluj</button>}
            <button className="btn btn-brass" onClick={() => (setExtra(note.key, val), onClose())}>Zapisz opis</button>
          </>
        ) : (
          <>
            <button className="btn text-destructive" onClick={() => confirm("Usunąć opis dodatkowy?") && (setExtra(note.key, ""), onClose())}>Usuń</button>
            <button className="btn btn-brass" onClick={() => setEdit(true)}>Edytuj</button>
          </>
        )}
      </div>
    </Modal>
  );
}

const LONG = new Set(["front", "back", "iss"]);

export function EditDialog({
  note,
  defaults,
  onClose,
  onCreated,
}: {
  note: Note | null; // null = new banknote
  defaults?: Partial<NoteData>;
  onClose: () => void;
  onCreated?: (key: string) => void;
}) {
  const [d, setD] = useState<NoteData>(() => {
    const base = note ? pickData(note) : (Object.fromEntries(FIELDS.map(([k]) => [k, ""])) as NoteData);
    return { ...base, ...(note ? {} : defaults) };
  });
  const [imgs, setImgs] = useState<{ front?: File | null; back?: File | null }>({});

  const save = async () => {
    if (!d.country.trim()) return alert("Podaj kraj.");
    let key = note?.key;
    if (note) saveNote(note.key, d, note.edited ? undefined : pickData(note));
    else key = addNote(d);
    for (const side of ["front", "back"] as const) {
      const f = imgs[side];
      if (f !== undefined && key) await setCustomImage(key, side, f);
    }
    if (!note && key) onCreated?.(key);
    onClose();
  };

  return (
    <Modal wide title={note ? "Edycja banknotu" : "Nowy banknot"} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        {(["front", "back"] as const).map((side) => (
          <div key={side} className="space-y-2">
            {imgs[side] ? (
              <img src={URL.createObjectURL(imgs[side]!)} alt="" className="aspect-[2/1] w-full rounded-lg object-contain ring-1 ring-brass/40 guilloche" />
            ) : note && imgs[side] !== null ? (
              <NoteImage note={note} side={side} />
            ) : (
              <div className="grid aspect-[2/1] place-items-center rounded-lg text-sm text-muted-foreground ring-1 ring-brass/25 guilloche">brak zdjęcia</div>
            )}
            <div className="flex gap-2">
              <label className="btn btn-brass flex-1 cursor-pointer justify-center">
                {side === "front" ? "Zmień zdjęcie awersu" : "Zmień zdjęcie rewersu"}
                <input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) setImgs((s) => ({ ...s, [side]: f })); }} />
              </label>
              <button className="btn" title="Usuń własne zdjęcie" onClick={() => setImgs((s) => ({ ...s, [side]: null }))}>Usuń</button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {FIELDS.map(([k, label]) => (
          <label key={k} className={`space-y-1 ${LONG.has(k) ? "col-span-2" : ""}`}>
            <span className="label-mono">{label}</span>
            {LONG.has(k) && k !== "iss" ? (
              <textarea className="field min-h-16 resize-y" value={d[k]} onChange={(e) => setD({ ...d, [k]: e.target.value })} />
            ) : (
              <input className="field" value={d[k]} onChange={(e) => setD({ ...d, [k]: e.target.value })} />
            )}
          </label>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          {note && (
            <button className="btn text-destructive" onClick={() => confirm("Usunąć ten banknot z katalogu?") && (removeNote(note.key), onClose())}>
              Usuń banknot
            </button>
          )}
          {note?.edited && !note.key.startsWith("new:") && (
            <button className="btn" onClick={() => confirm("Przywrócić oryginalne dane z katalogu?") && (resetNote(note.key), onClose())}>
              Przywróć oryginał
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button className="btn" onClick={onClose}>Anuluj</button>
          <button className="btn btn-brass" onClick={save}>Zapisz zmiany</button>
        </div>
      </div>
    </Modal>
  );
}
