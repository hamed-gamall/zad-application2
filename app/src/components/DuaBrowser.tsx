"use client";

import type { DuaCategory } from "@/lib/types";
import AdhkarDuaBrowser from "@/components/AdhkarDuaBrowser";

// Dua categories share the Adhkar browsing experience, scoped to duas.
export default function DuaBrowser({ categories }: { categories: DuaCategory[] }) {
  return <AdhkarDuaBrowser azkar={[]} dua={categories} initialTab="dua" />;
}
