import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { maintenanceAPI } from '../../services/api';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function TrackRepairs() {
  const [repairs, setRepairs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const res = await maintenanceAPI.getAll();
      setRepairs(res.data.data || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData().finally(() => setLoading(false)); }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await fetchData(); setRefreshing(false); }} colors={['#7C3AED']} />}
    >
      {repairs.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔧</Text>
          <Text style={styles.emptyText}>ยังไม่มีรายการแจ้งซ่อม</Text>
        </View>
      ) : (
        repairs.map((req) => (
          <View key={req.request_id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.reqTitle} numberOfLines={1}>{req.title}</Text>
              <StatusBadge status={req.status} size="sm" />
            </View>
            {req.category && <Text style={styles.meta}>🏷 {req.category}</Text>}
            <Text style={styles.meta}>📅 {new Date(req.requested_at).toLocaleDateString('th-TH')}</Text>
            {req.updates && req.updates.length > 0 && (
              <View style={styles.timeline}>
                <Text style={styles.timelineTitle}>อัปเดตล่าสุด:</Text>
                {req.updates.slice(-1).map((u: any) => (
                  <View key={u.update_id} style={styles.timelineItem}>
                    <View style={styles.dot} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.updateComment}>{u.comment || 'ไม่มีข้อความ'}</Text>
                      <Text style={styles.updateDate}>{new Date(u.updated_at).toLocaleDateString('th-TH')}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6', padding: 16 },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  reqTitle: { fontSize: 14, fontWeight: '700', color: '#1F2937', flex: 1, marginRight: 8 },
  meta: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  timeline: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 10 },
  timelineTitle: { fontSize: 12, fontWeight: '600', color: '#9CA3AF', marginBottom: 6 },
  timelineItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#7C3AED', marginTop: 4 },
  updateComment: { fontSize: 13, color: '#374151' },
  updateDate: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#9CA3AF', fontSize: 15 },
});
