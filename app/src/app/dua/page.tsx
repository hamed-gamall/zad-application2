import type { Metadata } from "next";
import { getDua } from "@/lib/data";
import ScreenHeader from "@/components/ui/ScreenHeader";
import DuaBrowser from "@/components/DuaBrowser";

export const metadata: Metadata = {
  title: "الأدعية",
  description: "مكتبة أدعية مأثورة مصنّفة لكل حال ومناسبة، مع إمكانية النسخ والمشاركة والحفظ في المفضلة.",
};

export default async function DuaIndexPage() {
  const { categories } = await getDua();
  return (
    <div className="mx-auto max-w-2xl">
      <ScreenHeader title="الأدعية" subtitle={`${categories.length.toLocaleString("ar-EG")} بابًا من الأدعية المأثورة`} />
      <DuaBrowser categories={categories} />
    </div>
  );
}
