import {AREA_TINT} from "@/components/chartTints";

// A pot's last months as a tiny area line. Plain SVG: no axes, no interaction.
export default function Sparkline({values, color, height = 44}: {values: number[]; color: string; height?: number}) {
  const W = 220;
  const points = values.length > 1 ? values : [values[0] ?? 0, values[0] ?? 0];
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const x = (i: number) => (i / (points.length - 1)) * W;
  const y = (v: number) => 4 + (1 - (v - min) / (max - min || 1)) * (height - 8);
  const line = points.map((v, i) => `${x(i)},${y(v)}`).join(" L");
  return (
    <svg viewBox={`0 0 ${W} ${height}`} width="100%" height={height} preserveAspectRatio="none" aria-hidden="true">
      <path d={`M0,${height} L${line} L${W},${height} Z`} fill={color} fillOpacity={AREA_TINT}/>
      <path d={`M${line}`} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke"/>
    </svg>
  );
}
