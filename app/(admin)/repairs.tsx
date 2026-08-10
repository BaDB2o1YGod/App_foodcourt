import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Alert,
  Modal, RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StatusBadge from '../../components/ui/StatusBadge';
import { maintenanceAPI, usersAPI } from '../../services/api';

export default function AdminRepairs() {
  const [repairs, setRepairs] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [filter, setFilter] = useState('ALL');

  const fetchData = async () => {
    try {
      const [repRes, usersRes] = await Promise.all([
        maintenanceAPI.getAll(),
        usersAPI.getAll({ role: 'MAINTENANCE' }),
      ]);
      setRepairs(repRes.data.data || []);
      setStaff(usersRes.data.data || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData().finally(() => setLoading(false)); }, []);

  const handleAssign = async (requestId: number, userId: number) => {
    try {
      await maintenanceAPI.assignStaff(requestId, { staffId: userId });
      Alert.alert('สำเร็จ', 'มอบหมายงานเรียบร้อย');
      setSelected(null);
      await fetchData();
    } catch (e: any) {
      Alert.alert('ผิดพลาด', e?.response?.data?.message || 'ไม่สามารถมอบหมายงานได้');
    }
  };

  if (loading) return <LoadingSpinner />;

  const FILTERS = ['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED'];
  const filtered = filter === 'ALL' ? repairs : repairs.filter((r) => r.status === filter);

  return (
    <View style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
      {/* Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {FILTERS.map((f) => (
          <TouchableOpacity key={f} style={[styles.filterBtn, filter === f && styles.filterActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, filter === f && styles.filterActiveText]}>
              {f === 'ALL' ? 'ทั้งหมด' : f === 'PENDING' ? 'รอดำเนินการ' : f === 'IN_PROGRESS' ? 'กําลังดําเนินการ' : 'เสร็จสิ้น'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await fetchData(); setRefreshing(false); }} colors={['#DC2626']} />}
        contentContainerStyle={{ padding: 16 }}
      >
        {filtered.length === 0 ? (
          <Text style={{ textAlign: 'center', marginTop: 20, color: '#6B7280' }}>ไม่มีงานรอดำเนินการซ่อม</Text>
        ) : (
          filtered.map((req) => {
          const canAssign = req.status === 'PENDING' && (!req.assignments || req.assignments.length === 0);
          return (
            <TouchableOpacity
              key={req.request_id}
              style={styles.card}
              onPress={() => setSelected(req)}
              disabled={!canAssign}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle} numberOfLines={1}>{req.title}</Text>
                <StatusBadge status={req.status} size="sm" />
              </View>
              {req.category && <Text style={styles.meta}>🏷 {req.category}</Text>}
              <Text style={styles.meta}> {new Date(req.requested_at).toLocaleDateString('th-TH')}</Text>
              {req.assignments && req.assignments.length > 0 && (
                <Text style={styles.assignedTo}><MaterialIcons name="engineering" size={14} color="#000000ff" /> {req.assignments[0]?.assignee?.first_name}</Text>
              )}
              {canAssign && <Text style={styles.tapHint}>แตะเพื่อมอบหมายงาน →</Text>}
            </TouchableOpacity>
          );
        })
        )}
      </ScrollView>

      {/* Modal — Assign */}
      <Modal visible={!!selected} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{selected?.title}</Text>
            <Text style={styles.modalSub}>เลือกช่างซ่อม:</Text>
            {staff.map((s) => (
              <TouchableOpacity key={s.user_id} style={styles.staffRow} onPress={() => handleAssign(selected.request_id, s.user_id)}>
                <View style={styles.staffAvatar}><Text>{s.first_name[0]}</Text></View>
                <Text style={styles.staffName}>{s.first_name} {s.last_name}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setSelected(null)}>
              <Text style={styles.cancelText}>ยกเลิก</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  filterScroll: { paddingHorizontal: 18, paddingBottom: 2, paddingTop: 10, flexGrow: 0 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 99, borderWidth: 1.5, borderColor: '#E5E7EB', marginRight: 8, backgroundColor: '#fff', },
  filterActive: { borderColor: '#DC2626', backgroundColor: '#FEF2F2' },
  filterText: { fontSize: 12, color: '#6B7280', },
  filterActiveText: { color: '#DC2626', fontWeight: '700', },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#1F2937', flex: 1, marginRight: 8 },
  meta: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
  assignedTo: { fontSize: 12, color: '#059669', marginTop: 4 },
  tapHint: { fontSize: 10, color: '#DC2626', marginTop: 6, textAlign: 'right' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  modalSub: { fontSize: 13, color: '#6B7280', marginBottom: 16 },
  staffRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  staffAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#DBEAFE', justifyContent: 'center', alignItems: 'center' },
  staffName: { fontSize: 14, color: '#1F2937', fontWeight: '500' },
  cancelBtn: { marginTop: 16, padding: 14, backgroundColor: '#F3F4F6', borderRadius: 12, alignItems: 'center' },
  cancelText: { color: '#374151', fontWeight: '600' },
});
