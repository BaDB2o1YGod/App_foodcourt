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
        const stalls = stallsRes.data.data || [];
        const bills = billsRes.data.data || [];
        const repairs = repairsRes.data.data || [];
        const dishware = dishwareRes.data.data || [];
        const occ = stalls.filter((s: any) => s.status === 'OCCUPIED').length;
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

  return (
    <ScrollView style={styles.container}>
      <Section title="🏪 สถานะล็อก">
        <StatRow label="ล็อกทั้งหมด" value={data.totalStalls} />
        <StatRow label="มีผู้เช่า" value={data.occupied} />
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
});
