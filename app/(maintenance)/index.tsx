import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { maintenanceAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function MaintenanceDashboard() {
  const { user } = useAuthStore();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!useAuthStore.getState().isAuthenticated) return;
      try {
        const res = await maintenanceAPI.getAll().catch(() => null);
        if (!res) throw new Error('API failed');
        setJobs(res?.data?.data || []);
      } catch (e) {
        console.warn(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoadingSpinner />;

  const pending = jobs.filter((j) => j.status === 'PENDING').length;
  const inProgress = jobs.filter((j) => j.status === 'IN_PROGRESS').length;
  const completed = jobs.filter((j) => j.status === 'COMPLETED').length;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>สวัสดี, {user?.first_name} 🔧</Text>
        <Text style={styles.subtitle}>ช่างซ่อมบำรุง</Text>
      </View>
      <View style={styles.statsGrid}>
        <StatCard label="รอดำเนินการ" count={pending} color="#F59E0B" />
        <StatCard label="กำลังดำเนินการ" count={inProgress} color="#3B82F6" />
        <StatCard label="เสร็จสิ้น" count={completed} color="#10B981" />
      </View>
      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>🔔 งานที่รออยู่ {pending} รายการ</Text>
        <Text style={styles.noticeText}>ไปที่ "งานทั้งหมด" เพื่อดูรายละเอียดและอัปเดตสถานะ</Text>
      </View>
    </ScrollView>
  );
}

function StatCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <Text style={[styles.count, { color }]}>{count}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { backgroundColor: '#F59E0B', padding: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, marginBottom: 16 },
  greeting: { color: '#fff', fontSize: 20, fontWeight: '800' },
  subtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
  statsGrid: { flexDirection: 'row', gap: 10, paddingHorizontal: 16 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, alignItems: 'center', borderTopWidth: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  count: { fontSize: 26, fontWeight: '800' },
  label: { fontSize: 11, color: '#6B7280', marginTop: 4, textAlign: 'center' },
  notice: { margin: 16, backgroundColor: '#FFFBEB', borderRadius: 14, padding: 16, borderLeftWidth: 4, borderLeftColor: '#F59E0B' },
  noticeTitle: { fontWeight: '700', color: '#92400E', marginBottom: 4 },
  noticeText: { color: '#B45309', fontSize: 13 },
});
