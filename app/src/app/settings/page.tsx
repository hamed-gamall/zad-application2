import type { Metadata } from "next";
import SettingsClient from "@/components/SettingsClient";
import ScreenHeader from "@/components/ui/ScreenHeader";

export const metadata: Metadata = {
  title: "الإعدادات",
  description: "خصّص مظهر الموقع: الثيم، نوع الخط، حجم الخط، وتثبيت التطبيق على جهازك.",
};

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <ScreenHeader title="الإعدادات" subtitle="خصّص التطبيق ليناسبك" />
      <SettingsClient />
    </div>
  );
}
