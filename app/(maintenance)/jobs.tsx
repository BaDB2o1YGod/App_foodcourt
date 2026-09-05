import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { maintenanceAPI } from '../../services/api';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function Jobs() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('PENDING');

  const fetchData = async () => {
    try {
      const res = await maintenanceAPI.getAll();
      setJobs(res.data.data || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData().finally(() => setLoading(false)); }, []);

  const filtered = filter === 'ALL' ? jobs : jobs.filter((j) => j.status === filter);

  if (loading) return <LoadingSpinner />;

  return (
    <View style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {['PENDING', 'IN_PROGRESS', 'COMPLETED', 'ALL'].map((f) => (
          <TouchableOpacity key={f} style={[styles.filterBtn, filter === f && styles.filterActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, filter === f && styles.filterActiveText]}>
              {f === 'ALL' ? 'ทั้งหมด' : f === 'PENDING' ? 'รอดำเนินการ' : f === 'IN_PROGRESS' ? 'กำลังดำเนินการ' : 'เสร็จสิ้น'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await fetchData(); setRefreshing(false); }} colors={['#F59E0B']} />}
      >
        {filtered.map((job) => (
          <TouchableOpacity key={job.request_id} style={styles.card} onPress={() => router.push({ pathname: '/(maintenance)/job-detail', params: { id: job.request_id } })}>
            <View style={styles.cardHeader}>
              <Text style={styles.jobTitle} numberOfLines={1}>{job.title}</Text>
              <StatusBadge status={job.status} size="sm" />
            </View>
            {job.category && <Text style={styles.meta}>🏷 {job.category}</Text>}
            <Text style={styles.meta}>📍 ล็อค {job.slot?.slot_number}</Text>
            <Text style={styles.meta}> {new Date(job.requested_at).toLocaleDateString('th-TH')}</Text>
            <Text style={styles.viewBtn}>ดูรายละเอียด →</Text>
          </TouchableOpacity>
        ))}
        {filtered.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.emptyText}>ไม่มีงานในสถานะนี้</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  filterScroll: { paddingHorizontal: 12, paddingVertical: 10, flexGrow: 0 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, borderWidth: 1.5, borderColor: '#E5E7EB', marginRight: 8, backgroundColor: '#fff' },
  filterActive: { borderColor: '#F59E0B', backgroundColor: '#FFFBEB' },
  filterText: { fontSize: 12, color: '#6B7280' },
  filterActiveText: { color: '#F59E0B', fontWeight: '700' },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  jobTitle: { fontSize: 14, fontWeight: '700', color: '#1F2937', flex: 1, marginRight: 8 },
  meta: { fontSize: 12, color: '#6B7280', marginBottom: 3 },
  viewBtn: { fontSize: 12, color: '#F59E0B', fontWeight: '700', marginTop: 6, textAlign: 'right' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyText: { color: '#9CA3AF' },
});
