'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useMemo } from 'react';

/**
 * The meter.
 *
 * Deliberately NOT a percentage score. A score compresses too much and moves for
 * reasons the user didn't cause. This shows the age they are currently on track to
 * retire — a real output, and one that visibly moves when they log a contribution.
 */

const MIN = 50;
const MAX = 72;
const START_ANGLE = 206;
const END_ANGLE = -26;
const CX = 170;
const CY = 170;
const R = 128;

const SEGMENTS: Array<[number, number, string]> = [
  [50, 55, '#00B37A'],
  [55, 59, '#7FD8A8'],
  [59, 63, '#FFD9E4'],
  [63, 67, '#FF8FB5'],
  [67, 72, '#FF3D8A'],
];

const angleFor = (v: number) =>
  ((START_ANGLE + ((v - MIN) / (MAX - MIN)) * (END_ANGLE - START_ANGLE)) * Math.PI) / 180;

const point = (v: number, radius: number): [number, number] => {
  const a = angleFor(v);
  return [CX + radius * Math.cos(a), CY - radius * Math.sin(a)];
};

const arcPath = (from: number, to: number, radius: number) => {
  const [x1, y1] = point(from, radius);
  const [x2, y2] = point(to, radius);
  return `M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`;
};

export interface GaugeProps {
  /** Projected retirement age, driven by logged contributions. */
  projectedAge: number;
  /** The age the user is aiming at. */
  targetAge: number;
}

export function Gauge({ projectedAge, targetAge }: GaugeProps) {
  const reduce = useReducedMotion();
  const clamped = Math.max(MIN, Math.min(MAX, projectedAge));

  const [needleX, needleY] = useMemo(() => point(clamped, R - 28), [clamped]);
  const [restX, restY] = useMemo(() => point(MIN, R - 28), []);
  const [tickOuterX, tickOuterY] = point(targetAge, R + 16);
  const [tickInnerX, tickInnerY] = point(targetAge, R - 15);
  const [labelX, labelY] = point(targetAge, R + 30);

  const years = Math.floor(projectedAge);
  const months = Math.round((projectedAge - years) * 12);
  const monthsOff = Math.round((projectedAge - targetAge) * 12);
  const behind = monthsOff > 0;

  return (
    <div className="text-center">
      <svg viewBox="0 0 340 218" className="mx-auto -mb-2.5 block w-full max-w-[330px]">
        {SEGMENTS.map(([from, to, colour]) => (
          <path key={from} d={arcPath(from, to, R)} stroke={colour} strokeWidth={16} fill="none" />
        ))}

        {[50, 55, 60, 65, 70].map((v) => {
          const [x1, y1] = point(v, R - 25);
          const [x2, y2] = point(v, R - 14);
          const [tx, ty] = point(v, R - 40);
          return (
            <g key={v}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,.4)" strokeWidth={2} />
              <text x={tx} y={ty + 4} textAnchor="middle" fill="rgba(255,255,255,.6)"
                    fontSize={10} fontWeight={600}>{v}</text>
            </g>
          );
        })}

        {/* Target sits as a fixed white tick — the needle drifts against it. */}
        <line x1={tickOuterX} y1={tickOuterY} x2={tickInnerX} y2={tickInnerY}
              stroke="#fff" strokeWidth={2.5} />
        <text x={labelX} y={labelY + 3} textAnchor="middle" fill="#fff" fontSize={10} fontWeight={700}>
          target {targetAge}
        </text>

        <motion.line
          x1={CX} y1={CY}
          initial={{ x2: restX, y2: restY }}
          animate={{ x2: needleX, y2: needleY }}
          transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 42, damping: 14, mass: 1.1 }}
          stroke="#fff" strokeWidth={4.5} strokeLinecap="round"
        />
        <circle cx={CX} cy={CY} r={9} fill="#fff" />
        <circle cx={CX} cy={CY} r={4.5} fill="#6C3BF5" />
      </svg>

      <motion.div
        key={`${years}-${months}`}
        initial={reduce ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-[44px] font-extrabold leading-none tracking-[-.04em] tabular-nums"
      >
        {years}y {months}m
      </motion.div>

      <p className="mt-1.5 text-[13px] opacity-90">
        Target {targetAge}. Tracking {Math.abs(monthsOff)} months {behind ? 'later' : 'earlier'}.
      </p>

      <span
        className="mt-3 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold backdrop-blur"
        style={{ background: behind ? 'rgba(255,61,138,.32)' : 'rgba(0,179,122,.38)' }}
      >
        {behind ? `▲ ${Math.abs(monthsOff)} months behind` : `✓ ${Math.abs(monthsOff)} months ahead`}
      </span>
    </div>
  );
}
