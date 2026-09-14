'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useMemo } from 'react';
import type { YearRow, PlanInput } from '@/lib/engine/types';
import { GOAL_META } from '@/lib/engine/defaults';
import { inr } from '@/lib/format';

const W = 880, H = 250, PAD = { l: 10, r: 10, t: 24, b: 26 };

/**
 * Hand-drawn SVG rather than a chart library: ~60 points, full control over the
 * goal pins and the required-corpus line, and no 80kB of bundle for one shape.
 */
export function LifeChart({ rows, required, input }: {
  rows: YearRow[]; required: number; input: PlanInput;
}) {
  const reduce = useReducedMotion();
  const { profile, goals } = input;

  const { area, line, pins, ticks, y0, yNeed } = useMemo(() => {
    const max = Math.max(...rows.map((r) => r.closingCorpus), required) * 1.1;
    const min = Math.min(0, ...rows.map((r) => r.closingCorpus));
    const x = (age: number) =>
      PAD.l + ((age - profile.currentAge) / (profile.terminalAge - profile.currentAge)) * (W - PAD.l - PAD.r);
    const y = (v: number) => PAD.t + (1 - (v - min) / (max - min)) * (H - PAD.t - PAD.b);

    const line = rows.map((r, i) => `${i ? 'L' : 'M'} ${x(r.age)} ${y(r.closingCorpus)}`).join(' ');
    const area = `M ${x(profile.currentAge)} ${y(0)} ${rows
      .map((r) => `L ${x(r.age)} ${y(r.closingCorpus)}`).join(' ')} L ${x(profile.terminalAge)} ${y(0)} Z`;

    const pins = goals
      .filter((g) => g.targetAge < profile.retirementAge)
      .map((g) => {
        const row = rows.find((r) => r.age === g.targetAge);
        return {
          id: g.id, emoji: GOAL_META[g.kind].emoji, name: g.name.split(' ')[0],
          cx: x(g.targetAge), cy: y(row?.closingCorpus ?? 0),
        };
      });

    const ticks = [profile.currentAge, 40, 50, profile.retirementAge, 70, 80, profile.terminalAge]
      .filter((a, i, arr) => a >= profile.currentAge && a <= profile.terminalAge && arr.indexOf(a) === i)
      .map((a) => ({ a, x: x(a), label: a === profile.currentAge ? 'now' : String(a) }));

    return { area, line, pins, ticks, y0: y(0), yNeed: y(required), xRet: x(profile.retirementAge) };
  }, [rows, required, profile, goals]);

  const xRet = PAD.l + ((profile.retirementAge - profile.currentAge)
    / (profile.terminalAge - profile.currentAge)) * (W - PAD.l - PAD.r);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full overflow-visible"
         role="img" aria-label="Projected corpus across your life">
      <defs>
        <linearGradient id="lifeFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6C3BF5" stopOpacity=".28" />
          <stop offset="100%" stopColor="#6C3BF5" stopOpacity="0" />
        </linearGradient>
      </defs>

      <line x1={PAD.l} y1={yNeed} x2={W - PAD.r} y2={yNeed}
            stroke="#FF3D8A" strokeDasharray="5 5" opacity={0.7} />
      <text x={W - PAD.r} y={yNeed - 6} textAnchor="end" fontSize={9.5} fontWeight={600} fill="#FF3D8A">
        needed at {profile.retirementAge} · {inr(required)}
      </text>

      <path d={area} fill="url(#lifeFill)" />
      <motion.path
        d={line} fill="none" stroke="#6C3BF5" strokeWidth={3} strokeLinejoin="round"
        initial={reduce ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.6, ease: [0.05, 0.7, 0.1, 1] }}
      />

      <line x1={xRet} y1={PAD.t} x2={xRet} y2={H - PAD.b} stroke="#6C3BF5" opacity={0.3} />
      <text x={xRet + 5} y={PAD.t + 4} fontSize={9.5} fontWeight={600} fill="#6C3BF5">
        retire {profile.retirementAge}
      </text>
      <line x1={PAD.l} y1={y0} x2={W - PAD.r} y2={y0} stroke="#E3DEEC" />

      {pins.map((p) => (
        <g key={p.id}>
          <line x1={p.cx} y1={p.cy} x2={p.cx} y2={PAD.t + 14} stroke="#E3DEEC" strokeDasharray="2 3" />
          <circle cx={p.cx} cy={p.cy} r={5.5} fill="#E08A00" stroke="#fff" strokeWidth={2.5} />
          <text x={p.cx} y={PAD.t + 8} textAnchor="middle" fontSize={9.5} fontWeight={600} fill="#7A748A">
            {p.emoji} {p.name}
          </text>
        </g>
      ))}

      {ticks.map((t) => (
        <text key={t.a} x={t.x} y={H - 8} textAnchor="middle" fontSize={9.5} fontWeight={600} fill="#7A748A">
          {t.label}
        </text>
      ))}
    </svg>
  );
}
