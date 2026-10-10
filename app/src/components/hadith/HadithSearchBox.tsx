"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { XIcon } from "@/components/icons/Icons";

export default function HadithSearchBox({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function submit(q: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (q.trim()) params.set("q", q.trim());
    else params.delete("q");
    params.delete("page");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(value);
      }}
      className="relative"
    >
      
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="ابحث في نص الأحاديث" type="search" aria-label="بحث"
        className="field"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            setValue("");
            submit("");
          }}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-on-night)]"
          aria-label="مسح البحث"
        >
          <XIcon size={15} />
        </button>
      )}
    </form>
  );
}
