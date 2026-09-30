export type Note = {
  i: number;
  c: number; // country index
  country: string;
  folder: string;
  pick: string;
  nom: string;
  cur: string;
  date: string;
  iss: string;
  front: string;
  back: string;
  variant: string;
  files: string[];
  imgFront?: string | undefined;
  imgBack?: string | undefined;
  key: string;
  hay: string;
  nomNum: number;
};

export type Catalog = { countries: { name: string; folder: string; count: number }[]; notes: Note[] };

export const noteKey = (country: string, pick: string) => `${country}|${pick}`;

function splitFiles(s: string) {
  const files = s.split(",").map((f) => f.trim()).filter(Boolean);
  const imgFront = files.find((f) => /awers/i.test(f)) ?? files[0];
  const imgBack = files.find((f) => /rewers/i.test(f)) ?? files.find((f) => f !== imgFront);
  return { files, imgFront, imgBack };
}

let cache: Promise<Catalog> | null = null;

export function loadCatalog(): Promise<Catalog> {
  if (cache) return cache;
  cache = (async () => {
    const res = await fetch(`${import.meta.env.BASE_URL}data/catalog.bin`);
    const stream = res.body!.pipeThrough(new DecompressionStream("gzip"));
    const raw = (await new Response(stream).json()) as {
      countries: [string, string][];
      rows: [number, string, string, string, string, string, string, string, string, string][];
    };
    const countries = raw.countries.map(([name, folder]) => ({ name, folder, count: 0 }));
    const notes: Note[] = raw.rows.map((r, i) => {
      const ct = countries[r[0]]!;
      ct.count++;
      const f = splitFiles(r[9]);
      return {
        i,
        c: r[0],
        country: ct.name,
        folder: ct.folder,
        pick: r[1],
        nom: r[2],
        cur: r[3],
        date: r[4],
        iss: r[5],
        front: r[6],
        back: r[7],
        variant: r[8],
        ...f,
        key: noteKey(ct.name, r[1]),
        hay: `${ct.name} ${r[1]} ${r[2]} ${r[3]} ${r[4]} ${r[5]} ${r[6]} ${r[7]} ${r[8]}`.toLowerCase(),
        nomNum: parseFloat(r[2].replace(/[^\d.,]/g, "").replace(",", ".")) || 0,
      };
    });
    return { countries, notes };
  })();
  return cache;
}
