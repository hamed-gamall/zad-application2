import type { Metadata } from "next";
import RadioBrowser from "@/components/audio/RadioBrowser";
import ScreenHeader from "@/components/ui/ScreenHeader";

export const metadata: Metadata = {
  title: "الإذاعات القرآنية",
  description: "استمع مباشرة إلى إذاعات القرآن الكريم المباشرة، وأضف ما يعجبك منها إلى المفضّلة.",
};

export default function RadioPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <ScreenHeader title="الإذاعات" subtitle="بث مباشر للقرآن الكريم" backHref="/tools" />
      <RadioBrowser />
    </div>
  );
}
