import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAzkar } from "@/lib/data";
import AzkarSession from "@/components/AzkarSession";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { categories } = await getAzkar();
  const cat = categories.find((c) => String(c.id) === id);
  return cat ? { title: cat.category } : {};
}

export default async function AzkarCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { categories } = await getAzkar();
  const cat = categories.find((c) => String(c.id) === id);
  if (!cat) notFound();

  return <AzkarSession category={cat} />;
}
