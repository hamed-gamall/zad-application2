import type { Metadata } from "next";
import ScreenHeader from "@/components/ui/ScreenHeader";
import { notFound } from "next/navigation";
import { getDua } from "@/lib/data";
import DuaFavoriteItem from "@/components/DuaFavoriteItem";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  return { title: decodeURIComponent(category) };
}

export default async function DuaCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const name = decodeURIComponent(category);
  const { categories } = await getDua();
  const cat = categories.find((c) => c.category === name);
  if (!cat) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <ScreenHeader title={cat.category} subtitle={`${cat.items.length.toLocaleString("ar-EG")} دعاء`} backHref="/azkar?tab=dua" />
      <ol className="px-6">
        {cat.items.map((item, i) => (
          <DuaFavoriteItem key={i} categoryName={cat.category} index={i} item={item} />
        ))}
      </ol>
    </div>
  );
}
