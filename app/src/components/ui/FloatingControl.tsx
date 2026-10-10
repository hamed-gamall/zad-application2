import Link from "next/link";

type Common = { label: string; active?: boolean; children: React.ReactNode; className?: string };

// Round, thumb-sized control. Renders a link when href is given.
export default function FloatingControl(
  props: Common & ({ href: string; onClick?: never } | { href?: undefined; onClick: () => void })
) {
  const cls = `fcontrol focus-ring ${props.active ? "fcontrol-on" : ""} ${props.className ?? ""}`;
  if (props.href !== undefined)
    return (
      <Link href={props.href} aria-label={props.label} className={cls}>
        {props.children}
      </Link>
    );
  return (
    <button type="button" onClick={props.onClick} aria-label={props.label} aria-pressed={props.active} className={cls}>
      {props.children}
    </button>
  );
}
