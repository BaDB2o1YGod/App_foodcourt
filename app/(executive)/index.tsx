import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Image } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { stallsAPI, billsAPI, maintenanceAPI, usersAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

// ─── Donut Chart ─────────────────────────────────────────────────────────────
interface DonutSlice {
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

function DonutChart({
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
          strokeLinecap="round"
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
function LegendItem({ color, label, value, total }: { color: string; label: string; value: number; total: number }) {
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

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ExecutiveDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    totalStalls: 0, occupied: 0, vacant: 0, occupancyRate: 0,
    totalTenants: 0, pendingBills: 0, pendingRepairs: 0, completedRepairs: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!useAuthStore.getState().isAuthenticated) return;
      try {
        const [stallsRes, billsRes, repairsRes, usersRes] = await Promise.all([
          stallsAPI.getAll().catch(() => null),
          billsAPI.getAll().catch(() => null),
          maintenanceAPI.getAll().catch(() => null),
          usersAPI.getAll({ role: 'TENANT' }).catch(() => null),
        ]);
        if (!stallsRes) throw new Error('API failed');
        const stalls = stallsRes?.data?.data || [];
        const bills = billsRes?.data?.data || [];
        const repairs = repairsRes?.data?.data || [];
        const occ = stalls.filter((s: any) => s.status === 'OCCUPIED').length;
        setStats({
          totalStalls: stalls.length,
          occupied: occ,
          vacant: stalls.filter((s: any) => s.status === 'VACANT').length,
          occupancyRate: stalls.length > 0 ? Math.round((occ / stalls.length) * 100) : 0,
          totalTenants: (usersRes?.data?.data || []).length,
          pendingBills: bills.filter((b: any) => b.status === 'PENDING').length,
          pendingRepairs: repairs.filter((r: any) => r.status === 'PENDING').length,
          completedRepairs: repairs.filter((r: any) => r.status === 'COMPLETED').length,
        });
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <LoadingSpinner />;

  const stallSlices: DonutSlice[] = [
    { color: '#059669', value: stats.occupied },   // green — มีผู้เช่า
    { color: '#D1FAE5', value: stats.vacant },      // light green — ว่าง
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.banner}>
        <View style={styles.bannerRow}>
          <View>
            <Text style={styles.bannerGreet}>สวัสดีคุณ, {user?.first_name}</Text>
            <Text style={styles.bannerSub}>บทบาท: ผู้บริหาร</Text>
          </View>
          <Image
            source={require('../../assets/images/bru-logo.png')}
            style={styles.bannerLogo}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* ── Donut Chart: สถานะล็อก ── */}
      <Section title="สถานะล็อก">
        <View style={styles.donutWrapper}>
          <DonutChart
            slices={stallSlices}
            size={160}
            strokeWidth={26}
            centerLabel={`${stats.occupancyRate}%`}
            centerSublabel="อัตราการเช่า"
          />
        </View>
        <View style={styles.legendWrapper}>
          <LegendItem color="#059669" label="มีผู้เช่า" value={stats.occupied} total={stats.totalStalls} />
          <LegendItem color="#D1FAE5" label="ว่าง" value={stats.vacant} total={stats.totalStalls} />
          <View style={styles.divider} />
          <Row label="ล็อกทั้งหมด" value={stats.totalStalls} />
        </View>
      </Section>

      <Section title="ผู้เช่า">
        <Row label="จำนวนผู้เช่า" value={stats.totalTenants} />
      </Section>

      <Section title="การเงิน">
        <Row label="บิลรอชำระ" value={stats.pendingBills} danger={stats.pendingBills > 0} />
      </Section>

      <Section title="งานซ่อม">
        <Row label="รอดำเนินการ" value={stats.pendingRepairs} danger={stats.pendingRepairs > 0} />
        <Row label="เสร็จสิ้น" value={stats.completedRepairs} />
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value, highlight, danger }: { label: string; value: any; highlight?: boolean; danger?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, highlight && styles.purple, danger && styles.red]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  banner: { backgroundColor: '#059669', padding: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, marginBottom: 16 },
  bannerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bannerLogo: { width: 72, height: 72 },
  bannerGreet: { color: '#fff', fontSize: 20, fontWeight: '800' },
  bannerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 2 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginHorizontal: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 12 },
  donutWrapper: { alignItems: 'center', marginBottom: 16 },
  legendWrapper: { marginTop: 4 },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  rowLabel: { fontSize: 14, color: '#6B7280' },
  rowValue: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  purple: { color: '#7C3AED' },
  red: { color: '#EF4444' },
});
