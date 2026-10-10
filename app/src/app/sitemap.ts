import type { MetadataRoute } from "next";
import { getHadithIndex, getDua } from "@/lib/data";

const BASE = "https://zad-almuslim-app.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    "",
    "/quran",
    "/hadith",
    "/azkar",
    "/dua",
    "/tools",
    "/tools/prayer-times",
    "/tools/qibla",
    "/tools/tasbih",
    "/tools/calendar",
    "/reciters",
    "/names",
    "/about",
    "/search",
  ].map((path) => ({ url: `${BASE}${path}`, changeFrequency: "daily" as const }));

  const surahRoutes = Array.from({ length: 114 }, (_, i) => ({
    url: `${BASE}/quran/${i + 1}`,
    changeFrequency: "monthly" as const,
  }));

  const { books } = await getHadithIndex();
  const hadithRoutes = books.map((b) => ({
    url: `${BASE}/hadith/${b.slug}`,
    changeFrequency: "monthly" as const,
  }));

  const { categories } = await getDua();
  const duaRoutes = categories.map((c) => ({
    url: `${BASE}/dua/${encodeURIComponent(c.category)}`,
    changeFrequency: "yearly" as const,
  }));

  return [...staticRoutes, ...surahRoutes, ...hadithRoutes, ...duaRoutes];
}
