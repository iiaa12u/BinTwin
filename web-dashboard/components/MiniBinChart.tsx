"use client";

type Point = {
  timestamp: string;
  fillPct: number;
};

export default function MiniBinChart({
  points,
}: {
  points?: Point[];
}) {
  if (!points || points.length < 2) {
    return (
      <div className="text-xs text-gray-500">
        Not enough historical points yet.
      </div>
    );
  }

  const width = 260;
  const height = 80;
  const pad = 8;

  const minY = 0;
  const maxY = 100;

  const xStep = (width - pad * 2) / Math.max(points.length - 1, 1);

  const toX = (index: number) => pad + index * xStep;
  const toY = (value: number) =>
    height - pad - ((value - minY) / (maxY - minY)) * (height - pad * 2);

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(p.fillPct)}`)
    .join(" ");

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <div className="mb-2 text-sm font-semibold text-black">Recent Actual Trend</div>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="block">
        <path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className="text-emerald-600"
        />
        {points.map((p, i) => (
          <circle
            key={`${p.timestamp}-${i}`}
            cx={toX(i)}
            cy={toY(p.fillPct)}
            r="2.5"
            className="fill-emerald-600"
          />
        ))}
      </svg>
      <div className="mt-2 flex justify-between text-[11px] text-gray-500">
        <span>{points[0]?.fillPct.toFixed(1)}%</span>
        <span>{points[points.length - 1]?.fillPct.toFixed(1)}%</span>
      </div>
    </div>
  );
}