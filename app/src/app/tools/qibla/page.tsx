import type { Metadata } from "next";
import QiblaClient from "@/components/QiblaClient";

export const metadata: Metadata = {
  title: "اتجاه القبلة",
  description: "احسب زاوية اتجاه القبلة من موقعك الحالي إلى الكعبة المشرّفة في مكة المكرمة.",
};

export default function QiblaPage() {
  return <QiblaClient />;
}
