import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { stallsAPI, billsAPI, maintenanceAPI, dishwareAPI } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function AdminReports() {
  const [data, setData] = useState({
    totalStalls: 0, occupied: 0, occupancyRate: 0,
    pendingBills: 0, overdueBills: 0,
    pendingRepairs: 0, completedRepairs: 0,
    pendingDishware: 0, approvedDishware: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [stallsRes, billsRes, repairsRes, dishwareRes] = await Promise.all([
          stallsAPI.getAll(),
          billsAPI.getAll(),
          maintenanceAPI.getAll(),
          dishwareAPI.getAll(),
        ]);
        const rawStalls = stallsRes.data.data || [];
        
        // De-duplicate stalks by slot_number (same logic as stalls.tsx)
        const map = new Map<string, any>();
        for (const s of rawStalls) {
          const key = s.slot_number;
          const existing = map.get(key);
          const hasActive = (x: any) => x.rental_contracts?.some((c: any) => c.status === 'ACTIVE');
          if (!existing || (!hasActive(existing) && hasActive(s))) {
            map.set(key, s);
          }
        }
        const stalls = Array.from(map.values());
        
        const bills = billsRes.data.data || [];
        const repairs = repairsRes.data.data || [];
        const dishware = dishwareRes.data.data || [];
        
        const occ = stalls.filter((s: any) => s.rental_contracts?.some((c: any) => c.status === 'ACTIVE')).length;
        
        setData({
          totalStalls: stalls.length,
          occupied: occ,
          occupancyRate: stalls.length > 0 ? Math.round((occ / stalls.length) * 100) : 0,
          pendingBills: bills.filter((b: any) => b.status === 'PENDING').length,
          overdueBills: bills.filter((b: any) => b.status === 'OVERDUE').length,
          pendingRepairs: repairs.filter((r: any) => r.status === 'PENDING').length,
          completedRepairs: repairs.filter((r: any) => r.status === 'COMPLETED').length,
          pendingDishware: dishware.filter((d: any) => d.status === 'PENDING').length,
          approvedDishware: dishware.filter((d: any) => d.status === 'APPROVED').length,
        });
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <LoadingSpinner />;

  const vacant = data.totalStalls - data.occupied;

  return (
    <ScrollView style={styles.container}>
      <Section title="🏪 สถานะล็อก (Occupancy)">
        
        {/* Visual Chart */}
        <View style={styles.chartContainer}>
          <View style={styles.chartBarBg}>
            <View style={[styles.chartBarFill, { width: `${data.occupancyRate}%` }]} />
          </View>
          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FECACA' }]} />
              <Text style={styles.legendText}>มีผู้เช่า ({data.occupied})</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#BBF7D0' }]} />
              <Text style={styles.legendText}>ว่าง ({vacant})</Text>
            </View>
          </View>
        </View>

        <StatRow label="ล็อกทั้งหมด" value={data.totalStalls} />
        <StatRow label="อัตราการเช่า" value={`${data.occupancyRate}%`} highlight />
      </Section>
      <Section title="💰 บิลและการชำระเงิน">
        <StatRow label="รอชำระ" value={data.pendingBills} />
        <StatRow label="เกินกำหนด" value={data.overdueBills} danger />
      </Section>
      <Section title="🔧 งานซ่อม">
        <StatRow label="รอดำเนินการ" value={data.pendingRepairs} />
        <StatRow label="เสร็จสิ้น" value={data.completedRepairs} />
      </Section>
      <Section title="🍽 ภาชนะ">
        <StatRow label="รออนุมัติ" value={data.pendingDishware} />
        <StatRow label="อนุมัติแล้ว" value={data.approvedDishware} />
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function StatRow({ label, value, highlight, danger }: { label: string; value: any; highlight?: boolean; danger?: boolean }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, highlight && styles.highlight, danger && styles.danger]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6', padding: 16 },
  section: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 12 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  statLabel: { fontSize: 14, color: '#6B7280' },
  statValue: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  highlight: { color: '#7C3AED' },
  danger: { color: '#EF4444' },

  /* Chart Styles */
  chartContainer: { marginBottom: 16, backgroundColor: '#F9FAFB', padding: 12, borderRadius: 12 },
  chartBarBg: { height: 24, backgroundColor: '#BBF7D0', borderRadius: 12, overflow: 'hidden', flexDirection: 'row' },
  chartBarFill: { height: '100%', backgroundColor: '#FECACA' },
  chartLegend: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { fontSize: 13, color: '#4B5563', fontWeight: '500' },
});
