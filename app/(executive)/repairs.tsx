import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { maintenanceAPI } from '../../services/api';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function ExecutiveRepairs() {
  const [repairs, setRepairs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try { const res = await maintenanceAPI.getAll(); setRepairs(res.data.data || []); }
    catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData().finally(() => setLoading(false)); }, []);

  const pending = repairs.filter((r) => r.status === 'PENDING').length;
  const inProgress = repairs.filter((r) => r.status === 'IN_PROGRESS').length;
  const completed = repairs.filter((r) => r.status === 'COMPLETED').length;

  if (loading) return <LoadingSpinner />;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await fetchData(); setRefreshing(false); }} colors={['#059669']} />}
    >
      <View style={styles.summaryRow}>
        <View style={[styles.sumCard, { borderTopColor: '#F59E0B' }]}><Text style={[styles.sumCount, { color: '#F59E0B' }]}>{pending}</Text><Text style={styles.sumLabel}>รอดำเนินการ</Text></View>
        <View style={[styles.sumCard, { borderTopColor: '#3B82F6' }]}><Text style={[styles.sumCount, { color: '#3B82F6' }]}>{inProgress}</Text><Text style={styles.sumLabel}>กำลังดำเนินการ</Text></View>
        <View style={[styles.sumCard, { borderTopColor: '#059669' }]}><Text style={[styles.sumCount, { color: '#059669' }]}>{completed}</Text><Text style={styles.sumLabel}>เสร็จสิ้น</Text></View>
      </View>
      {repairs.map((req) => (
        <View key={req.request_id} style={styles.card}>
          <View style={styles.cardRow}>
            <Text style={styles.title} numberOfLines={1}>{req.title}</Text>
            <StatusBadge status={req.status} size="sm" />
          </View>
          {req.category && <Text style={styles.meta}>🏷 {req.category}</Text>}
          <Text style={styles.meta}>📅 {new Date(req.requested_at).toLocaleDateString('th-TH')}</Text>
          <Text style={styles.meta}>👤 {req.tenant?.first_name} — ล็อก {req.slot?.slot_number}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6', padding: 12 },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  sumCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center', borderTopWidth: 3, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  sumCount: { fontSize: 18, fontWeight: '800' },
  sumLabel: { fontSize: 10, color: '#6B7280', marginTop: 2, textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  title: { fontSize: 13, fontWeight: '700', color: '#1F2937', flex: 1, marginRight: 8 },
  meta: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
});
