<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Gablota (banknote catalog app)
- Catalog data lives in public/data/catalog.bin (gzipped JSON, decoded with DecompressionStream) — keeps it under the 10MB file limit and works offline.
- UI lives in src/components/gablota/App.tsx; src/routes/index.tsx only wraps it — so the same App builds as a plain SPA for Electron.
- Collections persist in localStorage; image folder handle persists in IndexedDB (File System Access API) — offline, no backend.
- Windows .exe: `npx vite build --config electron/vite.config.mts`, then @electron/packager with electron/main.cjs (serves files via app:// protocol so fetch works).
