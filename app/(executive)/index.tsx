import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { stallsAPI, billsAPI, maintenanceAPI, usersAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.banner}>
        <Text style={styles.bannerGreet}>สวัสดี, {user?.first_name} 📊</Text>
        <Text style={styles.bannerSub}>บทบาท: ผู้บริหาร</Text>
      </View>

      <Section title="🏪 สถานะล็อก">
        <Row label="ล็อกทั้งหมด" value={stats.totalStalls} />
        <Row label="มีผู้เช่า" value={stats.occupied} />
        <Row label="ว่าง" value={stats.vacant} />
        <Row label="อัตราการเช่า" value={`${stats.occupancyRate}%`} highlight />
      </Section>

      <Section title="👥 ผู้เช่า">
        <Row label="จำนวนผู้เช่า" value={stats.totalTenants} />
      </Section>

      <Section title="💰 การเงิน">
        <Row label="บิลรอชำระ" value={stats.pendingBills} danger={stats.pendingBills > 0} />
      </Section>

      <Section title="🔧 งานซ่อม">
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
  bannerGreet: { color: '#fff', fontSize: 20, fontWeight: '800' },
  bannerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 2 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginHorizontal: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  rowLabel: { fontSize: 14, color: '#6B7280' },
  rowValue: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  purple: { color: '#7C3AED' },
  red: { color: '#EF4444' },
});
