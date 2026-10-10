export default function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status">
      <div className="flex flex-col items-center gap-3">
        <svg aria-hidden viewBox="0 0 48 48" className="star-spin h-12 w-12 text-gold"><path d="M24 2l6 6h8v8l6 6-6 6v8h-8l-6 6-6-6h-8v-8l-6-6 6-6V8h8z" fill="rgba(200,164,90,.12)" stroke="currentColor" strokeWidth="1.4" /></svg>
        <p className="text-sm text-[var(--muted-on-night)]">جارٍ التحميل…</p>
      </div>
    </div>
  );
}
