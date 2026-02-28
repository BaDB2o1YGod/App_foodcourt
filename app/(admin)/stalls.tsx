import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, RefreshControl } from 'react-native';
import { stallsAPI } from '../../services/api';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function AdminStalls() {
  const [stalls, setStalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const res = await stallsAPI.getAll();
      setStalls(res.data.data || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData().finally(() => setLoading(false)); }, []);

  const changeStatus = (stall: any) => {
    const options = ['VACANT', 'OCCUPIED', 'MAINTENANCE'].filter((s) => s !== stall.status);
    Alert.alert('เปลี่ยนสถานะ', `ล็อก ${stall.slot_number}`, [
      ...options.map((s) => ({
        text: s === 'VACANT' ? 'ว่าง' : s === 'OCCUPIED' ? 'มีผู้เช่า' : 'ซ่อมบำรุง',
        onPress: async () => {
          try {
            await stallsAPI.update(stall.slot_id, { status: s });
            await fetchData();
          } catch (e: any) {
            Alert.alert('ผิดพลาด', e?.response?.data?.message || 'ไม่สามารถอัปเดตได้');
          }
        },
      })),
      { text: 'ยกเลิก', style: 'cancel' },
    ]);
  };

  const STATUS_BG: Record<string, string> = { VACANT: '#D1FAE5', OCCUPIED: '#DBEAFE', MAINTENANCE: '#FEF3C7' };

  if (loading) return <LoadingSpinner />;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await fetchData(); setRefreshing(false); }} colors={['#DC2626']} />}
    >
      {/* Summary */}
      <View style={styles.summaryRow}>
        {['VACANT', 'OCCUPIED', 'MAINTENANCE'].map((s) => (
          <View key={s} style={[styles.summaryCard, { backgroundColor: STATUS_BG[s] }]}>
            <Text style={styles.summaryCount}>{stalls.filter((st) => st.status === s).length}</Text>
            <Text style={styles.summaryLabel}>{s === 'VACANT' ? 'ว่าง' : s === 'OCCUPIED' ? 'มีผู้เช่า' : 'ซ่อม'}</Text>
          </View>
        ))}
      </View>
      {/* Grid */}
      <View style={styles.grid}>
        {stalls.map((st) => (
          <TouchableOpacity key={st.slot_id} style={[styles.slot, { backgroundColor: STATUS_BG[st.status] || '#F3F4F6' }]} onPress={() => changeStatus(st)}>
            <Text style={styles.slotNum}>{st.slot_number}</Text>
            <Text style={styles.slotSize}>{st.slot_size || '—'}</Text>
            <Text style={styles.slotRent}>฿{Number(st.rent || 0).toLocaleString()}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  summaryRow: { flexDirection: 'row', gap: 10, padding: 16 },
  summaryCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  summaryCount: { fontSize: 22, fontWeight: '800', color: '#1F2937' },
  summaryLabel: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8, paddingBottom: 24 },
  slot: {
    width: '30%', borderRadius: 12, padding: 12, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 2,
  },
  slotNum: { fontSize: 14, fontWeight: '800', color: '#1F2937' },
  slotSize: { fontSize: 11, color: '#6B7280', marginTop: 1 },
  slotRent: { fontSize: 11, color: '#7C3AED', marginTop: 2 },
});
