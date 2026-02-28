import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { stallsAPI } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function ExecutiveStalls() {
  const [stalls, setStalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    (async () => {
      try { const res = await stallsAPI.getAll(); setStalls(res.data.data || []); }
      catch (e) { console.error(e); } finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <LoadingSpinner />;

  const filtered = filter === 'ALL' ? stalls : stalls.filter((s) => s.status === filter);
  const STATUS_BG: Record<string, string> = { VACANT: '#D1FAE5', OCCUPIED: '#DBEAFE', MAINTENANCE: '#FEF3C7' };

  return (
    <View style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
      <View style={styles.summary}>
        {[['ทั้งหมด', stalls.length, '#059669'], ['มีผู้เช่า', stalls.filter(s => s.status === 'OCCUPIED').length, '#3B82F6'], ['ว่าง', stalls.filter(s => s.status === 'VACANT').length, '#10B981']].map(([label, count, color]) => (
          <View key={String(label)} style={[styles.sumCard, { borderTopColor: color as string }]}>
            <Text style={[styles.sumCount, { color: color as string }]}>{count}</Text>
            <Text style={styles.sumLabel}>{label as string}</Text>
          </View>
        ))}
      </View>
      <View style={styles.filterRow}>
        {['ALL', 'VACANT', 'OCCUPIED', 'MAINTENANCE'].map((f) => (
          <TouchableOpacity key={f} style={[styles.filterBtn, filter === f && styles.filterActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, filter === f && styles.filterActiveText]}>
              {f === 'ALL' ? 'ทั้งหมด' : f === 'VACANT' ? 'ว่าง' : f === 'OCCUPIED' ? 'มีผู้เช่า' : 'ซ่อม'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={filtered}
        numColumns={3}
        keyExtractor={(item) => item.slot_id.toString()}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => (
          <View style={[styles.slot, { backgroundColor: STATUS_BG[item.status] || '#F3F4F6' }]}>
            <Text style={styles.slotNum}>{item.slot_number}</Text>
            <Text style={styles.slotSize}>{item.slot_size || '—'}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', padding: 12, gap: 10 },
  sumCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 10, alignItems: 'center', borderTopWidth: 3, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  sumCount: { fontSize: 20, fontWeight: '800' },
  sumLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginBottom: 8 },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#fff' },
  filterActive: { borderColor: '#059669', backgroundColor: '#ECFDF5' },
  filterText: { fontSize: 11, color: '#6B7280' },
  filterActiveText: { color: '#059669', fontWeight: '700' },
  slot: { flex: 1, margin: 4, borderRadius: 10, padding: 10, minHeight: 65, justifyContent: 'center', alignItems: 'center' },
  slotNum: { fontWeight: '800', fontSize: 14, color: '#1F2937' },
  slotSize: { fontSize: 10, color: '#6B7280', marginTop: 1 },
});
