import type { Metadata } from "next";
import TasbihClient from "@/components/TasbihClient";

export const metadata: Metadata = {
  title: "السبحة الإلكترونية",
  description: "سبحة رقمية أنيقة لعدّ التسبيح والتحميد والتكبير وسائر الأذكار.",
};

export default function TasbihPage() {
  return <TasbihClient />;
}
