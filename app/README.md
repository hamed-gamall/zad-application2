# زَادُ المُسْلِم — Zad al-Muslim

منصة إسلامية شاملة: قرآن كريم بتلاوة وتفسير، حديث شريف من تسعة كتب، أذكار
وأدعية مأثورة، أسماء الله الحسنى، ومواقيت صلاة واتجاه قبلة — بلا حساب، بلا
إعلانات، وبيانات المستخدم محفوظة محليًا فقط.

A full-scope Islamic platform built **source-first**: every piece of Quran
text, Tafsir, Hadith, Azkar, Dua, and Names content in this repo is copied
directly from a cited open dataset — nothing is AI-generated or invented.
See **`data/SOURCES.md`** for the complete source analysis, what each
provided source actually contains, and why each inclusion/exclusion
decision was made.

## Stack

- **Next.js 16** (App Router, TypeScript, Turbopack)
- **Tailwind CSS v4** with a custom manuscript-illumination design system (see `src/app/globals.css`)
- No database, no auth — content is server-rendered from bundled JSON; user state (bookmarks, favorites, Tasbih, reading prefs) lives in `localStorage` only
- PWA: manifest, service worker (offline app-shell), installable icons

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

### Production build

```bash
npm run build
npm start
```

> **Note:** the build fetches Amiri / Amiri Quran / Cairo from Google
> Fonts at build time via `next/font/google`. This needs outbound internet
> access (works out of the box on Vercel and any normal dev machine).

### Deploying to Vercel

This is a stock Next.js App Router project — push to a Git repo and import
it in Vercel with zero configuration. No environment variables are
required (see `.env.example` — it documents the *optional* ones only).

## Project structure

```
data/                    Bundled, source-derived content (see data/SOURCES.md)
  quran/{text,meta,tafsir,translation}/  Per-surah chunked JSON
  hadith/<book>/page-*.json              Paginated hadith (9 books)
  azkar/azkar.json, dua/dua.json         Full category data
  names/{allah,prophet}.json
  search/{quran,hadith}.json             Flat indices for /api/search
scripts/sync-data.mjs    Re-fetches & rebuilds everything in /data from
                         the original source repos (see below)
src/
  app/                   Routes (see Information architecture)
  components/            UI + interactive client components
  lib/
    data.ts              Server-side readers for /data (fs-based)
    live.ts              Client helpers for live APIs (Aladhan, mp3quran.net)
    storage.ts           localStorage helpers (bookmarks, favorites, prefs)
    types.ts             Shared TypeScript models
    exactPrayer.ts        The verbatim funeral prayer text used on /about
public/
  manifest.webmanifest, sw.js, icons/    PWA assets
```

## Information architecture

Routes were derived from what the sources actually support, not a fixed
page count:

| Route | What it is |
|---|---|
| `/` | Home — live prayer-time ring, Friday Al-Kahf banner, daily Ayah/Hadith/Dua |
| `/quran`, `/quran/[surah]` | Surah index + full reader (Tafsir toggle, translation, per-surah reciter audio, per-ayah bookmark/share) |
| `/hadith`, `/hadith/[book]` | 9 books, paginated browsing |
| `/azkar`, `/azkar/[id]` | 132 categories, interactive per-dhikr repeat counters + audio |
| `/dua`, `/dua/[category]` | 123 categories, copy/share/favorite |
| `/names` | 99 Names of Allah (meaning + audio) + 90 Names of the Prophet ﷺ |
| `/tools`, `/tools/prayer-times`, `/tools/qibla`, `/tools/tasbih`, `/tools/calendar` | Live prayer times, Qibla compass, electronic Tasbih, Hijri calendar |
| `/reciters` | Full reciter library from mp3quran.net, searchable, per-surah playback |
| `/search` | Cross-corpus full-text search (Quran + Hadith) |
| `/my` | Locally-saved bookmarks & favorites |
| `/about` | Site introduction + the exact funeral prayer (verbatim, byte-verified against the brief) |

## Data pipeline: what's bundled vs. fetched live

Per the brief's explicit performance requirement ("do not download
enormous datasets unnecessarily on the initial page load"):

- **Bundled, chunked per-surah/per-page** (server reads from disk, nothing
  oversized is ever shipped to the client at once): Quran text & metadata,
  3 Tafsir editions + 1 English translation, all 9 Hadith books (matn
  only — see `data/SOURCES.md` for why classical commentary is excluded
  from the bundle), all Azkar & Dua categories, both Names lists.
- **Always fetched live** (genuinely dynamic or too large/volatile to
  freeze): prayer times, Qibla direction, Hijri calendar (Aladhan API),
  and the reciter library + per-surah audio streams (mp3quran.net API,
  cdn.islamic.network for per-ayah audio).

### Extending the bundled data

`scripts/sync-data.mjs` is the exact pipeline that produced everything in
`/data`. To add more of the 39 Tafsir/translation editions available in
the source repo, uncomment (or add) an entry in `TAFSIR_FILES` /
`TRANSLATION_FILES` inside that script and re-run:

```bash
node scripts/sync-data.mjs --only=tafsir,search
```

(`search` is included because the search index doesn't need touching for
new Tafsir, but does if you add Hadith content.)

## Local-only user data

No accounts, no server-side user data. `src/lib/storage.ts` wraps
`localStorage` for: Quran bookmarks & reading progress, reading
preferences (font size, active Tafsir, reciter), Dua/Hadith favorites,
Tasbih running totals. All defensive against private-browsing/quota
errors — failures are silently ignored rather than crashing the app.

## Accessibility & SEO

- Semantic HTML, visible focus rings (`.focus-ring`), `dir="rtl"` from the
  document root, `aria-label`s on icon-only controls.
- Per-page `generateMetadata`, dynamic `sitemap.ts` / `robots.ts`,
  Open Graph tags, `lang="ar"`.
- Respects `prefers-reduced-motion` for the ambient hero animation.

## Known limitations of this delivery

- Only 3 Tafsir editions + 1 translation are bundled out of 39 available
  in the source repo — trivially extendable, see above.
- Hadith classical commentary (e.g. Fath al-Bari style *sharh*) is not
  bundled to keep initial payload size sane; only the hadith matn is
  included in full for all 9 books.
- `metadataBase` and sitemap URLs use a placeholder domain
  (`zad-almuslim.example`) — update `NEXT_PUBLIC_SITE_URL` (see
  `.env.example`) and the constants in `src/app/sitemap.ts` /
  `src/app/layout.tsx` once a real domain is chosen.
