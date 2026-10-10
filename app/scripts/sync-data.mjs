#!/usr/bin/env node
/**
 * scripts/sync-data.mjs
 *
 * Rebuilds (or extends) everything under /data from the real, cited source
 * repositories. This is the same pipeline used to produce the bundled data
 * in this repo — run it again after adding a new Tafsir id to TAFSIR_FILES
 * below to pull in more of the 39 Tafsir/translation editions available in
 * the source repo, without touching any UI code.
 *
 * Usage:
 *   node scripts/sync-data.mjs            # rebuild everything
 *   node scripts/sync-data.mjs --only=hadith,azkar
 *
 * Network: only fetches from raw.githubusercontent.com (GitHub raw content).
 */

import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DATA = path.join(ROOT, "data");

const RAW = {
  quranApp: "https://raw.githubusercontent.com/Mohamed-Nagdy/Quran-App-Data/master",
  adhkarJson: "https://raw.githubusercontent.com/rn0x/Adhkar-json/main",
  islamicApi: "https://raw.githubusercontent.com/itsSamBz/Islamic-Api/main",
};

// Add more entries here to enable more Tafsir/translation editions from the
// same source repo (39 are available under /Tafaseer in Mohamed-Nagdy/Quran-App-Data).
const TAFSIR_FILES = {
  muyassar: { file: "ar_muyassar.json", label: "التفسير الميسر - مجمع الملك فهد" },
  saadi: { file: "sa3dy.json", label: "تفسير السعدي" },
  e3rab: { file: "e3rab.json", label: "إعراب القرآن" },
  // katheer: { file: "katheer.json", label: "تفسير ابن كثير" },
  // tabary: { file: "tabary.json", label: "تفسير الطبري" },
  // qortoby: { file: "qortoby.json", label: "تفسير القرطبي" },
  // baghawy: { file: "baghawy.json", label: "تفسير البغوي" },
  // waseet: { file: "waseet.json", label: "التفسير الوسيط" },
};
const TRANSLATION_FILES = {
  en_sahih: { file: "en_sahih.json", label: "Sahih International (English)" },
};

const HADITH_BOOKS = {
  bukhari: "صحيح البخاري",
  muslim: "صحيح مسلم",
  abi_daud: "سنن أبي داود",
  trmizi: "جامع الترمذي",
  nasai: "سنن النسائي",
  ibn_maja: "سنن ابن ماجه",
  malik: "موطأ الإمام مالك",
  ahmed: "مسند الإمام أحمد بن حنبل",
  darimi: "سنن الدارمي",
};

const HADITH_PAGE_SIZE = 40;
const AUDIO_BASE = `${RAW.adhkarJson}/audio`;

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed ${res.status}: ${url}`);
  return res.json();
}
async function writeJson(relPath, obj) {
  const full = path.join(DATA, relPath);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, JSON.stringify(obj), "utf-8");
}
function pad3(n) {
  return String(n).padStart(3, "0");
}

async function syncQuran() {
  console.log("→ Quran metadata + text");
  const metaFiles = ["surah.json", "juz.json", "ruku.json", "manzil.json", "rub.json", "page.json", "sajda.json"];
  const surahMeta = await fetchJson(`${RAW.quranApp}/quran_metadata/surah.json`);
  for (const mf of metaFiles) {
    const data = mf === "surah.json" ? surahMeta : await fetchJson(`${RAW.quranApp}/quran_metadata/${mf}`);
    await writeJson(`quran/meta/${mf}`, data);
  }

  for (let i = 1; i <= 114; i++) {
    const d = await fetchJson(`${RAW.quranApp}/Quran Suras/surah_${i}.json`);
    const keys = Object.keys(d.verse).sort((a, b) => Number(a.split("_")[1]) - Number(b.split("_")[1]));
    const verses = keys.map((k) => ({ ayah: Number(k.split("_")[1]), text: d.verse[k].replace(/^\ufeff/, "") }));
    const s = surahMeta[i - 1];
    await writeJson(`quran/text/${pad3(i)}.json`, {
      number: i,
      nameArabic: d.name,
      titleArabic: s.titleAr,
      titleEnglish: s.titleEn,
      titleTranslit: s.title,
      revelationPlace: s.place,
      revelationType: s.type,
      ayahCount: s.count,
      verses,
      source: "Mohamed-Nagdy/Quran-App-Data",
    });
  }
}

async function chunkBySurah(url, dstDir, sourceLabel) {
  const data = await fetchJson(url);
  const bySura = {};
  for (const item of data) {
    (bySura[item.sura] ??= []).push({ ayah: item.aya, text: item.text });
  }
  for (const [sura, verses] of Object.entries(bySura)) {
    verses.sort((a, b) => a.ayah - b.ayah);
    await writeJson(`${dstDir}/${pad3(Number(sura))}.json`, { surah: Number(sura), verses, source: sourceLabel });
  }
}

async function syncTafsirAndTranslation() {
  console.log("→ Tafsir + translation editions");
  for (const [id, { file, label }] of Object.entries(TAFSIR_FILES)) {
    await chunkBySurah(`${RAW.quranApp}/Tafaseer/${file}`, `quran/tafsir/${id}`, label);
  }
  for (const [id, { file, label }] of Object.entries(TRANSLATION_FILES)) {
    await chunkBySurah(`${RAW.quranApp}/Tafaseer/${file}`, `quran/translation/${id}`, label);
  }
}

async function syncHadith() {
  console.log("→ Hadith (9 books)");
  const bookIndex = [];
  for (const [slug, arabicName] of Object.entries(HADITH_BOOKS)) {
    const data = await fetchJson(`${RAW.quranApp}/Hadith Books Json/${slug}.json`);
    const total = data.length;
    const pages = Math.ceil(total / HADITH_PAGE_SIZE);
    for (let p = 0; p < pages; p++) {
      const chunk = data.slice(p * HADITH_PAGE_SIZE, (p + 1) * HADITH_PAGE_SIZE);
      const items = chunk.map((h) => ({ number: h.number, text: (h.hadith || "").trim() }));
      await writeJson(`hadith/${slug}/page-${String(p + 1).padStart(4, "0")}.json`, {
        book: slug, bookNameArabic: arabicName, page: p + 1, pages, items,
        source: "Mohamed-Nagdy/Quran-App-Data (Hadith Books Json)",
      });
    }
    bookIndex.push({ slug, nameArabic: arabicName, total, pages, pageSize: HADITH_PAGE_SIZE });
    console.log(`  ${slug}: ${total} hadiths → ${pages} pages`);
  }
  await writeJson("hadith/index.json", { books: bookIndex });
}

async function syncAzkarAndDua() {
  console.log("→ Azkar + Dua");
  const adhkar = await fetchJson(`${RAW.adhkarJson}/adhkar.json`);
  const categories = adhkar.map((cat) => ({
    id: cat.id,
    category: cat.category,
    audio: cat.audio ? `${AUDIO_BASE}/${cat.audio.split("/").pop()}` : null,
    items: (cat.array || []).map((it) => ({
      id: it.id,
      text: (it.text || "").trim(),
      count: it.count ?? 1,
      audio: it.audio ? `${AUDIO_BASE}/${it.audio.split("/").pop()}` : null,
    })),
  }));
  await writeJson("azkar/azkar.json", { categories, source: "rn0x/Adhkar-json" });

  const azkarCategoryNames = new Set(categories.map((c) => c.category));
  const EXCLUDE_SUBSTR = ["الصباح", "المساء", "النوم", "الاستيقاظ", "الوضوء", "الآذان", "بعد السلام", "التسبيح، التحميد"];
  const mnAzkar = await fetchJson(`${RAW.quranApp}/azkar.json`);
  const duaByCat = {};
  for (const item of mnAzkar) {
    const cat = (item.category || "").trim();
    if (EXCLUDE_SUBSTR.some((x) => cat.includes(x))) continue;
    (duaByCat[cat] ??= []).push({
      text: (item.zekr || "").trim(),
      count: item.count,
      reference: (item.reference || "").trim(),
      description: (item.description || "").trim(),
    });
  }
  const duaCategories = Object.entries(duaByCat).map(([category, items]) => ({ category, items }));
  await writeJson("dua/dua.json", {
    categories: duaCategories,
    source: "Mohamed-Nagdy/Quran-App-Data (azkar.json, deduplicated against Adhkar-json categories)",
  });
  void azkarCategoryNames;
}

async function syncNames() {
  console.log("→ Names of Allah + Prophet");
  const allah = await fetchJson(`${RAW.islamicApi}/Allah-99-names.json`);
  await writeJson("names/allah.json", { names: allah.data.names, source: "itsSamBz/Islamic-Api" });
  const prophet = await fetchJson(`${RAW.quranApp}/names_of_moahmed.json`);
  await writeJson("names/prophet.json", { names: prophet.data, source: "Mohamed-Nagdy/Quran-App-Data" });
}

async function buildSearchIndex() {
  console.log("→ Search index (Quran + Hadith)");
  const quranEntries = [];
  for (let i = 1; i <= 114; i++) {
    const d = JSON.parse(await fs.readFile(path.join(DATA, `quran/text/${pad3(i)}.json`), "utf-8"));
    for (const v of d.verses) {
      if (v.ayah === 0) continue;
      quranEntries.push({ surah: i, surahName: d.titleArabic, ayah: v.ayah, text: v.text });
    }
  }
  await writeJson("search/quran.json", quranEntries);

  const index = JSON.parse(await fs.readFile(path.join(DATA, "hadith/index.json"), "utf-8"));
  const hadithEntries = [];
  for (const book of index.books) {
    for (let p = 1; p <= book.pages; p++) {
      const page = JSON.parse(
        await fs.readFile(path.join(DATA, `hadith/${book.slug}/page-${String(p).padStart(4, "0")}.json`), "utf-8")
      );
      for (const item of page.items) {
        hadithEntries.push({ book: book.slug, bookName: book.nameArabic, number: item.number, text: item.text.slice(0, 400) });
      }
    }
  }
  await writeJson("search/hadith.json", hadithEntries);
}

async function main() {
  const onlyArg = process.argv.find((a) => a.startsWith("--only="));
  const only = onlyArg ? onlyArg.split("=")[1].split(",") : null;
  const steps = {
    quran: syncQuran,
    tafsir: syncTafsirAndTranslation,
    hadith: syncHadith,
    azkar: syncAzkarAndDua,
    names: syncNames,
    search: buildSearchIndex,
  };
  for (const [name, fn] of Object.entries(steps)) {
    if (only && !only.includes(name)) continue;
    await fn();
  }
  console.log("✓ Data sync complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
