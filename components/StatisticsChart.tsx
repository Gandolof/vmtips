"use client";

import { useState } from "react";
import type { StatisticsEntry, StatisticsTimelineMatch } from "../lib/queries";

const LINE_COLORS = [
  "#d4a62a",
  "#1d63d8",
  "#cf1f2e",
  "#1f8d52",
  "#7c3aed",
  "#0f766e",
  "#ea580c",
  "#475569",
  "#db2777",
  "#0891b2",
];

export default function StatisticsChart({
  timelineMatches,
  entries,
  currentUserId,
}: {
  timelineMatches: StatisticsTimelineMatch[];
  entries: StatisticsEntry[];
  currentUserId: number | null;
}) {
  if (timelineMatches.length === 0 || entries.length === 0) {
    return (
      <div className="small-text">
        Ingen statistik att visa ännu. Resultat behöver matas in först.
      </div>
    );
  }

  const width = 1120;
  const height = 420;
  const paddingTop = 24;
  const paddingRight = 24;
  const paddingBottom = 48;
  const paddingLeft = 52;
  const innerWidth = width - paddingLeft - paddingRight;
  const innerHeight = height - paddingTop - paddingBottom;
  const yTicks = 4;

  function getX(index: number) {
    if (timelineMatches.length === 1) {
      return paddingLeft + innerWidth / 2;
    }

    return paddingLeft + (index / (timelineMatches.length - 1)) * innerWidth;
  }

  function getY(value: number) {
    return paddingTop + innerHeight - (value / visibleMaxPoints) * innerHeight;
  }

  const chartEntries = entries.map((entry, index) => ({
    ...entry,
    color: LINE_COLORS[index % LINE_COLORS.length],
  }));
  const currentUserEntryKeys = chartEntries
    .filter((entry) => currentUserId !== null && entry.user_id === currentUserId)
    .map((entry) => `${entry.user_id}-${entry.prediction_set}`);
  const [selectedEntryKeys, setSelectedEntryKeys] = useState<string[]>(
    currentUserEntryKeys.length > 0
      ? currentUserEntryKeys
      : chartEntries.map((entry) => `${entry.user_id}-${entry.prediction_set}`)
  );
  const visibleEntries = chartEntries.filter((entry) =>
    selectedEntryKeys.includes(`${entry.user_id}-${entry.prediction_set}`)
  );
  const visibleMaxPoints = Math.max(
    10,
    ...visibleEntries.flatMap((entry) => entry.timeline.map((point) => point.totalPoints))
  );

  function toggleEntry(entryKey: string) {
    setSelectedEntryKeys((current) =>
      current.includes(entryKey)
        ? current.filter((key) => key !== entryKey)
        : [...current, entryKey]
    );
  }

  return (
    <div>
      <div className="small-text" style={{ marginBottom: 12 }}>
        Klicka p&#229; namnlistan f&#246;r att visa eller d&#246;lja en tipsrad. X-axeln f&#246;ljer f&#228;rdigspelade matcher i kronologisk ordning.
      </div>

      <div className="stats-chart-wrap">
        <svg
          className="stats-chart"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Utveckling av poäng över tid"
        >
          {Array.from({ length: yTicks + 1 }).map((_, index) => {
            const value = (visibleMaxPoints / yTicks) * index;
            const y = getY(value);

            return (
              <g key={index}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  className="stats-grid-line"
                />
                <text x={paddingLeft - 10} y={y + 4} textAnchor="end" className="stats-axis-text">
                  {Math.round(value)}
                </text>
              </g>
            );
          })}

          {timelineMatches.map((match, index) => {
            const x = getX(index);

            return (
              <g key={match.matchId}>
                <line
                  x1={x}
                  y1={paddingTop}
                  x2={x}
                  y2={height - paddingBottom}
                  className="stats-vertical-line"
                />
                <text
                  x={x}
                  y={height - paddingBottom + 20}
                  textAnchor="middle"
                  className="stats-axis-text"
                >
                  {index + 1}
                </text>
              </g>
            );
          })}

          {visibleEntries.map((entry, index) => {
            const path = entry.timeline
              .map((point, pointIndex) => {
                const x = getX(pointIndex);
                const y = getY(point.totalPoints);
                return `${pointIndex === 0 ? "M" : "L"} ${x} ${y}`;
              })
              .join(" ");

            return (
              <g key={`${entry.user_id}-${entry.prediction_set}`}>
                <path
                  d={path}
                  fill="none"
                  stroke={entry.color}
                  strokeWidth={index < 5 ? 3.5 : 2.25}
                  strokeOpacity={index < 5 ? 0.95 : 0.42}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {index < 5 &&
                  entry.timeline.map((point, pointIndex) => (
                    <circle
                      key={point.matchId}
                      cx={getX(pointIndex)}
                      cy={getY(point.totalPoints)}
                      r={4}
                      fill={entry.color}
                    />
                  ))}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="small-text" style={{ marginTop: 10 }}>
        Matchnummer {timelineMatches.length > 0 ? `1-${timelineMatches.length}` : ""} motsvarar matchordningen i turneringen.
      </div>

      <div className="stats-legend">
        {chartEntries.map((entry, index) => (
          <button
            className={`stats-legend-item ${
              selectedEntryKeys.includes(`${entry.user_id}-${entry.prediction_set}`)
                ? "stats-legend-item-selected"
                : "stats-legend-item-muted"
            }`}
            key={`${entry.user_id}-${entry.prediction_set}`}
            onClick={() => toggleEntry(`${entry.user_id}-${entry.prediction_set}`)}
            type="button"
          >
            <span
              className="stats-legend-swatch"
              style={{
                backgroundColor: entry.color,
                opacity: index < 5 ? 1 : 0.55,
              }}
            />
            <span className="stats-legend-name">{entry.name}</span>
            <span className="stats-legend-value">{entry.total_points} p</span>
          </button>
        ))}
      </div>
    </div>
  );
}
