import type { Metadata } from "next";
import HijriCalendarClient from "@/components/HijriCalendarClient";
import ScreenHeader from "@/components/ui/ScreenHeader";

export const metadata: Metadata = {
  title: "التقويم الهجري",
  description: "التاريخ الهجري الحالي وتقويم الشهر الهجري مع المناسبات الإسلامية.",
};

export default function CalendarPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <ScreenHeader title="التقويم الهجري" backHref="/tools" />
      <HijriCalendarClient />
    </div>
  );
}
