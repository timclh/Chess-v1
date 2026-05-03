/**
 * RatingHistoryGraph Component
 *
 * Pure SVG line chart showing rating history over the last 20 games.
 * No external charting library required.
 */

import React from 'react';
import EloService from '../services/EloService';

const CHART_WIDTH = 360;
const CHART_HEIGHT = 160;
const PADDING = { top: 20, right: 20, bottom: 30, left: 45 };
const PLOT_W = CHART_WIDTH - PADDING.left - PADDING.right;
const PLOT_H = CHART_HEIGHT - PADDING.top - PADDING.bottom;

/**
 * @param {Object} props
 * @param {Array<{rating: number, date: string}>} props.history
 * @param {number} props.currentRating
 * @param {string} [props.label] - e.g. "Chess" or "Xiangqi"
 */
export function RatingHistoryGraph({ history = [], currentRating, label }) {
  // Build data points: include current rating at the end if history is empty or differs
  const points = [...history];
  if (points.length === 0) {
    points.push({ rating: currentRating, date: new Date().toISOString() });
  }

  const ratings = points.map(p => p.rating);
  const minR = Math.min(...ratings) - 20;
  const maxR = Math.max(...ratings) + 20;
  const rangeR = maxR - minR || 1;

  // Scale helpers
  const xScale = (i) => PADDING.left + (i / Math.max(points.length - 1, 1)) * PLOT_W;
  const yScale = (r) => PADDING.top + PLOT_H - ((r - minR) / rangeR) * PLOT_H;

  // Build SVG path
  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i).toFixed(1)} ${yScale(p.rating).toFixed(1)}`)
    .join(' ');

  // Area fill (gradient under the line)
  const areaD = pathD
    + ` L ${xScale(points.length - 1).toFixed(1)} ${(PADDING.top + PLOT_H).toFixed(1)}`
    + ` L ${xScale(0).toFixed(1)} ${(PADDING.top + PLOT_H).toFixed(1)} Z`;

  // Y-axis ticks (5 ticks)
  const yTicks = [];
  for (let i = 0; i <= 4; i++) {
    const val = Math.round(minR + (rangeR * i) / 4);
    yTicks.push({ val, y: yScale(val) });
  }

  // Determine trend
  const delta = points.length >= 2 ? points[points.length - 1].rating - points[0].rating : 0;
  const trendColor = delta > 0 ? '#27ae60' : delta < 0 ? '#e74c3c' : '#f39c12';

  return (
    <div style={{ marginTop: '12px' }}>
      {label && (
        <div style={{ fontSize: '13px', color: '#aaa', marginBottom: '6px', fontWeight: 'bold' }}>
          {label} Rating History
        </div>
      )}
      <svg
        width={CHART_WIDTH}
        height={CHART_HEIGHT}
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}
      >
        <defs>
          <linearGradient id={`area-grad-${label}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={trendColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={trendColor} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line
              x1={PADDING.left} y1={t.y}
              x2={PADDING.left + PLOT_W} y2={t.y}
              stroke="rgba(255,255,255,0.05)" strokeWidth="1"
            />
            <text
              x={PADDING.left - 6} y={t.y + 4}
              textAnchor="end" fontSize="10" fill="#666"
            >
              {t.val}
            </text>
          </g>
        ))}

        {/* Area fill */}
        {points.length > 1 && (
          <path d={areaD} fill={`url(#area-grad-${label})`} />
        )}

        {/* Line */}
        <path d={pathD} fill="none" stroke={trendColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Data points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={xScale(i)}
            cy={yScale(p.rating)}
            r={points.length <= 10 ? 3 : 2}
            fill={trendColor}
            stroke="#2d2d2d"
            strokeWidth="1"
          >
            <title>{`${p.rating} — ${new Date(p.date).toLocaleDateString()}`}</title>
          </circle>
        ))}

        {/* X-axis label */}
        <text
          x={PADDING.left + PLOT_W / 2}
          y={CHART_HEIGHT - 4}
          textAnchor="middle" fontSize="10" fill="#555"
        >
          Last {points.length} game{points.length !== 1 ? 's' : ''}
        </text>
      </svg>
    </div>
  );
}

/**
 * RatingTrend — small inline indicator showing rating direction.
 * @param {Object} props
 * @param {Array<{rating: number}>} props.history
 * @param {number} props.currentRating
 */
export function RatingTrend({ history = [], currentRating }) {
  if (history.length < 2) return null;

  const prev = history[history.length - 2]?.rating ?? currentRating;
  const delta = currentRating - prev;

  if (delta === 0) {
    return <span style={{ color: '#f39c12', fontSize: '14px' }} title="No change">→</span>;
  }

  return (
    <span
      style={{
        color: delta > 0 ? '#27ae60' : '#e74c3c',
        fontSize: '14px',
        fontWeight: 'bold',
      }}
      title={`${delta > 0 ? '+' : ''}${delta} since last game`}
    >
      {delta > 0 ? '▲' : '▼'} {delta > 0 ? '+' : ''}{delta}
    </span>
  );
}

export default RatingHistoryGraph;
