"use client";

import { useEffect, useState } from "react";

const PHRASES: { from: number; to: number; text: string }[] = [
  { from: 5, to: 12, text: "بارك الله في صباحكم" },
  { from: 12, to: 17, text: "بارك الله في نهاركم" },
  { from: 17, to: 20, text: "بارك الله في مسائكم" },
  { from: 20, to: 24, text: "بارك الله في ليلكم" },
  { from: 0, to: 5, text: "بارك الله في ليلكم" },
];

function phraseForHour(hour: number) {
  return PHRASES.find((p) => hour >= p.from && hour < p.to)?.text ?? "أهلًا بك";
}

export default function GreetingLine({ className = "" }: { className?: string }) {
  // Default to the "daytime" phrase during SSR so there is sensible content
  // before hydration; the client then swaps in the real local-time phrase.
  const [text, setText] = useState("بارك الله في نهاركم");

  useEffect(() => {
    function update() {
      setText(phraseForHour(new Date().getHours()));
    }
    update();
    const id = setInterval(update, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <p className={className} suppressHydrationWarning>
      {text}
    </p>
  );
}
