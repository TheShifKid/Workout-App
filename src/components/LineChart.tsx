import { formatDate, formatWeight } from '../lib/format';
import type { ChartPoint } from '../services/statsService';

/**
 * גרף קו ב-SVG טהור — בלי ספריית גרפים.
 * מצייר את המשקל של הסט הכבד ביותר בכל אימון, לאורך זמן.
 * ה-SVG ב-RTL הפוך במכוון: הנקודה החדשה ביותר נמצאת בצד שמאל,
 * כמו שקוראים ציר זמן בעברית — מימין (ישן) לשמאל (חדש).
 */
export function LineChart({ points, metric = 'topWeight' }: {
  points: ChartPoint[];
  metric?: 'topWeight' | 'oneRepMax';
}) {
  if (points.length === 0) return null;

  const W = 320;
  const H = 160;
  const PAD_X = 10;
  const PAD_Y = 16;

  const values = points.map((p) => p[metric]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || Math.max(1, max * 0.1);
  const lo = min - span * 0.15;
  const hi = max + span * 0.15;

  // ציר X הפוך: אינדקס 0 (הישן) בימין, האחרון (החדש) בשמאל.
  const x = (i: number) =>
    points.length === 1
      ? W / 2
      : W - PAD_X - (i / (points.length - 1)) * (W - PAD_X * 2);
  const y = (v: number) => PAD_Y + (1 - (v - lo) / (hi - lo)) * (H - PAD_Y * 2);

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p[metric])}`).join(' ');
  const area = `${line} L${x(points.length - 1)},${H - PAD_Y} L${x(0)},${H - PAD_Y} Z`;

  const last = points[points.length - 1];
  const first = points[0];

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-40 w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label={`גרף התקדמות: מ-${formatWeight(first[metric])} ק"ג ל-${formatWeight(last[metric])} ק"ג`}
      >
        {[0, 0.5, 1].map((t) => (
          <line
            key={t}
            x1={PAD_X}
            x2={W - PAD_X}
            y1={PAD_Y + t * (H - PAD_Y * 2)}
            y2={PAD_Y + t * (H - PAD_Y * 2)}
            stroke="var(--color-line)"
            strokeWidth="1"
          />
        ))}

        <path d={area} fill="var(--color-volt)" opacity="0.08" />
        <path
          d={line}
          fill="none"
          stroke="var(--color-volt)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {points.map((p, i) => (
          <circle
            key={p.t}
            cx={x(i)}
            cy={y(p[metric])}
            r={i === points.length - 1 ? 4.5 : 2.5}
            fill={i === points.length - 1 ? 'var(--color-volt)' : 'var(--color-ink)'}
            stroke="var(--color-volt)"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      <div className="tnum mt-1 flex justify-between text-[11px] text-muted">
        <span>
          {formatDate(last.date)} · {formatWeight(last[metric])} ק"ג
        </span>
        <span>
          {formatDate(first.date)} · {formatWeight(first[metric])} ק"ג
        </span>
      </div>
    </div>
  );
}
