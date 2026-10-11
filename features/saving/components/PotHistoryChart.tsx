"use client";

import {useFormatter} from "next-intl";
import {Area, AreaChart, CartesianGrid, ReferenceDot, ReferenceLine, Tooltip, XAxis, YAxis} from "recharts";
import {AREA_TINT} from "@/components/chartTints";
import {SURPLUS_PATTERN_ID, SurplusPatternDef} from "@/features/saving/components/SurplusPattern";

export type PotMarker = {month: string; amount: number; name: string};

// One pot's balance over time. One-off deposits and withdrawals are marked on the line; the axis
// reaches below zero when the balance does (the Überschuss can).
export default function PotHistoryChart({months, values, color, hatched = false, markers = []}: {
  months: string[];
  values: number[];
  color: string;
  hatched?: boolean;
  markers?: PotMarker[];
}) {
  const format = useFormatter();
  const data = months.map((month, i) => ({month, value: values[i] ?? 0}));
  const byMonth = new Map(data.map((row) => [row.month, row.value]));
  const label = (month: string) => format.dateTime(new Date(`${month}-01T00:00:00Z`), {month: "short", year: "2-digit", timeZone: "UTC"});

  return (
    <div className="h-60">
      <AreaChart data={data} margin={{top: 10, right: 10, left: 0, bottom: 0}} width="100%" height="100%">
        {hatched ? <defs><SurplusPatternDef/></defs> : null}
        <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.6}/>
        <XAxis dataKey="month" tickFormatter={label} axisLine={false} tickLine={false} tickMargin={8} interval="preserveStartEnd" tick={{fontSize: "0.75rem", fill: "var(--muted)"}}/>
        <YAxis axisLine={false} tickLine={false} tickMargin={8} tickFormatter={(v) => format.number(Number(v), "integer")} tick={{fontSize: "0.75rem", fill: "var(--muted)"}}/>
        <ReferenceLine y={0} stroke="var(--muted)" strokeOpacity={0.5}/>
        <Tooltip
          cursor={{stroke: "var(--muted)", strokeDasharray: "3 3"}}
          labelFormatter={(month) => format.dateTime(new Date(`${month}-01T00:00:00Z`), {month: "long", year: "numeric", timeZone: "UTC"})}
          formatter={(value) => format.number(Number(value), "currency")}
          contentStyle={{borderRadius: "var(--radius)", border: "1px solid var(--default)", background: "var(--surface)"}}
        />
        <Area type="linear" dataKey="value" stroke={color} strokeWidth={2.5} fill={hatched ? `url(#${SURPLUS_PATTERN_ID})` : color} fillOpacity={hatched ? 1 : AREA_TINT} isAnimationActive={false}/>
        {markers.map((marker, i) => (
          <ReferenceDot
            key={`${marker.month}-${i}`}
            x={marker.month}
            y={byMonth.get(marker.month) ?? 0}
            r={5}
            fill={marker.amount < 0 ? "var(--danger)" : "var(--success)"}
            stroke="var(--surface)"
            strokeWidth={2}
          />
        ))}
      </AreaChart>
    </div>
  );
}
