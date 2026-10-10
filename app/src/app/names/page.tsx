import type { Metadata } from "next";
import { getNamesOfAllah, getNamesOfProphet } from "@/lib/data";
import ScreenHeader from "@/components/ui/ScreenHeader";
import NamesClient from "@/components/NamesClient";

export const metadata: Metadata = {
  title: "أسماء الله الحسنى وأسماء النبي ﷺ",
  description: "أسماء الله الحسنى التسعة والتسعون مع معانيها واستماعها، وأسماء النبي محمد ﷺ.",
};

export default async function NamesPage() {
  const [allah, prophet] = await Promise.all([getNamesOfAllah(), getNamesOfProphet()]);
  return (
    <div className="mx-auto max-w-2xl">
      <ScreenHeader title="أسماء الله الحسنى" subtitle="«وَلِلَّهِ الْأَسْمَاءُ الْحُسْنَىٰ فَادْعُوهُ بِهَا»" backHref="/tools" />
      <NamesClient allah={allah.names} prophet={prophet.names.map((n) => n.name)} />
    </div>
  );
}
