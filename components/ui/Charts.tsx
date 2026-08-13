import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

// ─── Donut Chart ─────────────────────────────────────────────────────────────
export interface DonutSlice {
  color: string;
  value: number;
}

interface DonutChartProps {
  slices: DonutSlice[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerSublabel?: string;
}

export function DonutChart({
  slices,
  size = 160,
  strokeWidth = 28,
  centerLabel,
  centerSublabel,
}: DonutChartProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const cx = size / 2;
  const cy = size / 2;

  let cumulativePercent = 0;
  const rendered: React.ReactNode[] = [];

  slices.forEach((slice, i) => {
    if (total === 0) return;
    const percent = slice.value / total;
    const offset = circumference * (1 - percent);
    // rotate so each arc starts where previous ended
    const rotation = -90 + cumulativePercent * 360;
    cumulativePercent += percent;

    rendered.push(
      <G key={i} rotation={rotation} origin={`${cx}, ${cy}`}>
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={slice.color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="butt"
        />
      </G>
    );
  });

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        {/* Background track */}
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke="#F3F4F6"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {total === 0 ? (
          <Circle
            cx={cx}
            cy={cy}
            r={radius}
            stroke="#E5E7EB"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
        ) : (
          rendered
        )}
      </Svg>
      {/* Center text overlay */}
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        {centerLabel !== undefined && (
          <Text style={donutStyles.centerLabel}>{centerLabel}</Text>
        )}
        {centerSublabel !== undefined && (
          <Text style={donutStyles.centerSub}>{centerSublabel}</Text>
        )}
      </View>
    </View>
  );
}

const donutStyles = StyleSheet.create({
  centerLabel: { fontSize: 28, fontWeight: '800', color: '#1F2937' },
  centerSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
});

// ─── Legend item ─────────────────────────────────────────────────────────────
export function LegendItem({ color, label, value, total }: { color: string; label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <View style={legendStyles.row}>
      <View style={[legendStyles.dot, { backgroundColor: color }]} />
      <Text style={legendStyles.label}>{label}</Text>
      <View style={legendStyles.right}>
        <Text style={legendStyles.value}>{value}</Text>
        <Text style={legendStyles.pct}>{pct}%</Text>
      </View>
    </View>
  );
}

const legendStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  label: { fontSize: 13, color: '#374151', flex: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  value: { fontSize: 14, fontWeight: '700', color: '#1F2937', minWidth: 28, textAlign: 'right' },
  pct: { fontSize: 12, color: '#9CA3AF', minWidth: 36, textAlign: 'right' },
});

// ─── Category Bar Item ───────────────────────────────────────────────────────
export function CategoryBarItem({ label, count, percent, color }: { label: string; count: number; percent: number; color: string }) {
  return (
    <View style={barStyles.container}>
      <View style={barStyles.header}>
        <Text style={barStyles.label}>{label} ({count} ครั้ง)</Text>
        <Text style={barStyles.pct}>{percent}%</Text>
      </View>
      <View style={barStyles.track}>
        <View style={[barStyles.fill, { width: `${percent}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

// ─── Slot Rank Item ──────────────────────────────────────────────────────────
export function SlotRankItem({ rank, slotNumber, count, maxCount }: { rank: number; slotNumber: string; count: number; maxCount: number }) {
  const percent = maxCount > 0 ? (count / maxCount) * 100 : 0;
  const rankBadges = ['', '', '', '', ''];
  const badge = rankBadges[rank] || `${rank + 1}.`;

  return (
    <View style={barStyles.container}>
      <View style={barStyles.header}>
        <Text style={barStyles.label}>{badge} {slotNumber}</Text>
        <Text style={barStyles.value}>{count} ครั้ง</Text>
      </View>
      <View style={barStyles.track}>
        <View style={[barStyles.fill, { width: `${percent}%`, backgroundColor: '#80639A' }]} />
      </View>
    </View>
  );
}

const barStyles = StyleSheet.create({
  container: { marginBottom: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151' },
  pct: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
  value: { fontSize: 12, fontWeight: '700', color: '#80639A' },
  track: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
});
