"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function FridayBanner() {
  const [isFriday, setIsFriday] = useState(false);

  useEffect(() => {
    // Date() is only stable on the client; avoids an SSR/client mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsFriday(new Date().getDay() === 5);
  }, []);

  if (!isFriday) return null;

  return (
    <div className="px-5 pb-4">
      <Link href="/quran/18" className="pressable focus-ring flex items-center gap-4 rounded-[26px] px-5 py-4" style={{ background: "linear-gradient(135deg, rgba(200,164,90,.22), rgba(15,61,54,.5))", boxShadow: "inset 0 0 0 1px rgba(227,201,135,.3)" }}>
        <span aria-hidden className="font-display text-3xl text-gold-bright">✦</span>
        <span className="min-w-0 flex-1">
          <span className="font-display block text-xl text-gold-bright">يوم الجمعة — سورة الكهف</span>
          <span className="block text-xs leading-relaxed text-[var(--muted-on-night)]">«من قرأ سورة الكهف يوم الجمعة أضاء له من النور ما بين الجمعتين»</span>
        </span>
      </Link>
    </div>
  );
}
