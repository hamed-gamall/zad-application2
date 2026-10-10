import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons/Icons";

export default function Pagination({
  page,
  totalPages,
  basePath,
  extraParams,
}: {
  page: number;
  totalPages: number;
  basePath: string;
  extraParams?: Record<string, string>;
}) {
  if (totalPages <= 1) return null;

  function href(p: number) {
    const params = new URLSearchParams(extraParams);
    params.set("page", String(p));
    return `${basePath}?${params.toString()}`;
  }

  return (
    <nav className="mt-8 flex items-center justify-between px-6 text-sm" aria-label="ترقيم الصفحات">
      {page > 1 ? (
        <Link href={href(page - 1)} className="fcontrol focus-ring">
          <ChevronRightIcon size={16} /> السابق
        </Link>
      ) : (
        <span />
      )}
      <span className="text-xs text-[var(--muted-on-night)]">
        صفحة {page.toLocaleString("ar")} من {totalPages.toLocaleString("ar")}
      </span>
      {page < totalPages ? (
        <Link href={href(page + 1)} className="fcontrol focus-ring">
          التالي <ChevronLeftIcon size={16} />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
