// The Überschuss is drawn hatched everywhere, so it never reads as a pot you booked into.
export const SURPLUS_COLOR = "var(--muted)";
export const SURPLUS_PATTERN_ID = "surplus-hatch";

export function SurplusPatternDef() {
  return (
    <pattern id={SURPLUS_PATTERN_ID} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="6" height="6" fill={SURPLUS_COLOR} fillOpacity={0.12}/>
      <line x1="0" y1="0" x2="0" y2="6" stroke={SURPLUS_COLOR} strokeWidth={2} strokeOpacity={0.7}/>
    </pattern>
  );
}

export function SurplusDot({className = "size-2.5"}: {className?: string}) {
  return (
    <span
      aria-hidden="true"
      className={`${className} inline-block shrink-0 rounded-full border border-[var(--muted)]`}
      style={{background: `repeating-linear-gradient(135deg, var(--muted) 0 1.5px, transparent 1.5px 3px)`}}
    />
  );
}
