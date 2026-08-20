"use client";

export type StockGaugeProduct = {
  name: string;
  stock: number;
  minStock: number;
};

export function classifyStockLevel(
  stockRaw: number,
  minRaw: number,
): "critical" | "orange" | "yellow" | "good" {
  const stock = Number(stockRaw ?? 0);
  const min = Number(minRaw ?? 0);
  if (stock <= 0) return "critical";
  if (!(min > 0)) return "good";
  if (stock <= min) return "critical";
  if (stock <= min * 1.5) return "orange";
  if (stock <= min * 2) return "yellow";
  return "good";
}

function gaugeMetrics(product: StockGaugeProduct) {
  const stock = Number(product?.stock ?? 0);
  const minRaw = Number(product?.minStock ?? 0);
  const min = Math.max(minRaw, 0.001);
  const max = Math.max(min * 2.5, stock * 1.15, min + 1);
  return {
    stock,
    min,
    max,
    redEnd: min,
    orangeEnd: min * 1.5,
    yellowEnd: min * 2,
  };
}

function valueToAngle(value: number, max: number) {
  const ratio = Math.min(Math.max(value / max, 0), 1);
  return Math.PI * (1 - ratio);
}

function pointOnArc(
  cx: number,
  cy: number,
  radius: number,
  value: number,
  max: number,
) {
  const angle = valueToAngle(value, max);
  return {
    x: cx + radius * Math.cos(angle),
    y: cy - radius * Math.sin(angle),
  };
}

function ringSegment(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  v0: number,
  v1: number,
  max: number,
) {
  if (v1 <= v0) return "";
  const p0out = pointOnArc(cx, cy, rOuter, v0, max);
  const p1out = pointOnArc(cx, cy, rOuter, v1, max);
  const p1in = pointOnArc(cx, cy, rInner, v1, max);
  const p0in = pointOnArc(cx, cy, rInner, v0, max);
  return [
    `M ${p0out.x} ${p0out.y}`,
    `A ${rOuter} ${rOuter} 0 0 1 ${p1out.x} ${p1out.y}`,
    `L ${p1in.x} ${p1in.y}`,
    `A ${rInner} ${rInner} 0 0 0 ${p0in.x} ${p0in.y}`,
    "Z",
  ].join(" ");
}

function formatTick(n: number) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "0";
  if (Math.abs(v - Math.round(v)) < 0.001) return String(Math.round(v));
  return v.toFixed(1);
}

function truncateName(name: string, max = 14) {
  const s = String(name || "");
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

const STATUS_LABEL = {
  critical: "Crítico",
  orange: "Bajo",
  yellow: "Precaución",
  good: "Adecuado",
} as const;

const ZONE = {
  critical: "#ef4444",
  orange: "#ed6c02",
  yellow: "#f9a825",
  good: "#22c55e",
  muted: "rgba(128, 128, 128, 0.18)",
  text: "currentColor",
  mutedText: "#8a8f8a",
  surface: "#ffffff",
};

type StockGaugeProps = {
  product: StockGaugeProduct;
  compact?: boolean;
  subtitle?: string | null;
};

export function StockGauge({
  product,
  compact = false,
  subtitle,
}: StockGaugeProps) {
  const { stock, min, max, redEnd, orangeEnd, yellowEnd } =
    gaugeMetrics(product);
  const status = classifyStockLevel(stock, Number(product.minStock ?? 0));

  const cx = 100;
  const cy = 108;
  const rOuter = compact ? 76 : 80;
  const rInner = compact ? 58 : 62;

  const zones = [
    { from: 0, to: redEnd, color: ZONE.critical },
    { from: redEnd, to: orangeEnd, color: ZONE.orange },
    { from: orangeEnd, to: yellowEnd, color: ZONE.yellow },
    { from: yellowEnd, to: max, color: ZONE.good },
  ];

  const needleEnd = pointOnArc(cx, cy, (rInner + rOuter) / 2, stock, max);
  const ticks = compact
    ? [
        { value: 0, label: "0" },
        { value: redEnd, label: formatTick(redEnd) },
        { value: max, label: formatTick(max) },
      ]
    : [
        { value: 0, label: "0" },
        { value: redEnd, label: formatTick(redEnd) },
        { value: orangeEnd, label: formatTick(orangeEnd) },
        { value: yellowEnd, label: formatTick(yellowEnd) },
        { value: max, label: formatTick(max) },
      ];

  const title = compact
    ? `${truncateName(product.name, 14)} · ${formatTick(stock)}`
    : `${product.name} (Stock: ${formatTick(stock)})`;

  const statusColor =
    status === "critical"
      ? ZONE.critical
      : status === "orange"
        ? ZONE.orange
        : status === "yellow"
          ? ZONE.yellow
          : ZONE.good;

  return (
    <div className="w-full min-w-0 text-center">
      <p
        className={`mb-0.5 truncate px-0.5 font-bold leading-tight text-foreground ${
          compact ? "text-[10px]" : "text-xs"
        }`}
        title={`${product.name} (Stock: ${stock})${subtitle ? ` · ${subtitle}` : ""}`}
      >
        {title}
      </p>
      {subtitle ? (
        <p className="mb-0.5 truncate text-[9px] text-muted">{subtitle}</p>
      ) : null}

      <svg
        viewBox="0 0 200 124"
        className={`mx-auto block w-full ${compact ? "max-w-[132px]" : "max-w-[270px]"}`}
        aria-label={`Stock ${stock} de ${product.name}`}
      >
        <path
          d={ringSegment(cx, cy, rInner, rOuter, 0, max, max)}
          fill={ZONE.muted}
        />
        {zones.map((z) =>
          z.to <= z.from ? null : (
            <path
              key={`${z.from}-${z.to}`}
              d={ringSegment(cx, cy, rInner, rOuter, z.from, z.to, max)}
              fill={z.color}
            />
          ),
        )}
        {ticks.map((t) => {
          const p = pointOnArc(cx, cy, rOuter + (compact ? 4 : 6), t.value, max);
          const lp = pointOnArc(
            cx,
            cy,
            rOuter + (compact ? 10 : 14),
            t.value,
            max,
          );
          const anchor =
            t.value <= max * 0.15
              ? "start"
              : t.value >= max * 0.85
                ? "end"
                : "middle";
          return (
            <g key={t.value}>
              {!compact ? (
                <line
                  x1={p.x}
                  y1={p.y}
                  x2={lp.x}
                  y2={lp.y}
                  stroke={ZONE.mutedText}
                  strokeWidth={1}
                />
              ) : null}
              <text
                x={lp.x}
                y={lp.y}
                textAnchor={anchor}
                dominantBaseline="middle"
                fontSize={compact ? 7 : 9}
                fill={ZONE.mutedText}
              >
                {t.label}
              </text>
            </g>
          );
        })}
        <line
          x1={cx}
          y1={cy}
          x2={needleEnd.x}
          y2={needleEnd.y}
          stroke={ZONE.text}
          strokeWidth={compact ? 2 : 2.5}
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r={compact ? 4 : 5} fill={ZONE.text} />
        <circle cx={cx} cy={cy} r={compact ? 2 : 2.5} fill={ZONE.surface} />
      </svg>

      <p
        className={`font-semibold leading-tight ${compact ? "text-[10px]" : "text-xs"}`}
        style={{ color: statusColor }}
      >
        {compact
          ? `mín. ${formatTick(min)}`
          : `${STATUS_LABEL[status]} · mín. ${formatTick(min)}`}
      </p>
    </div>
  );
}
