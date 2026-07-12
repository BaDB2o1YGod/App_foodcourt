import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { stallsAPI } from '../../services/api';

export default function StallStatus() {
  const { foodCourt } = useLocalSearchParams();
  const [stalls, setStalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');

  const FILTERS = ['ALL', 'VACANT', 'UNAVAILABLE'];

  useEffect(() => {
    (async () => {
      try {
        const params = foodCourt ? { food_court_id: foodCourt } : {};
        const res = await stallsAPI.getAll(params);
        setStalls(res.data.data || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [foodCourt]);

  if (loading) return <LoadingSpinner />;

  const filtered = filter === 'ALL'
    ? stalls
    : stalls.filter((s) => filter === 'VACANT' ? s.status === 'VACANT' : s.status !== 'VACANT');

  const STATUS_COLOR: Record<string, string> = {
    VACANT: '#D1FAE5', UNAVAILABLE: '#fedbdbff',
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ศูนย์อาหาร {foodCourt || 'ทั้งหมด'}</Text>
      {/* Filters */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity key={f} style={[styles.filterBtn, filter === f && styles.filterActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, filter === f && styles.filterActiveText]}>
              {f === 'ALL' ? 'ทั้งหมด' : f === 'VACANT' ? 'ว่าง' : 'ไม่ว่าง'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {/* Summary */}
      <View style={styles.summaryRow}>
        <SummaryCard label="ว่าง" count={stalls.filter((s) => s.status === 'VACANT').length} color="#10B981" />
        <SummaryCard label="ไม่ว่าง" count={stalls.filter((s) => s.status !== 'VACANT').length} color="#ff7e7eff" />
      </View>
      {/* Grid */}
      <FlatList
        data={filtered}
        numColumns={3}
        keyExtractor={(item) => item.slot_id.toString()}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <View style={[styles.slot, { backgroundColor: item.status === 'VACANT' ? STATUS_COLOR.VACANT : STATUS_COLOR.UNAVAILABLE }]}>
            <Text style={styles.slotNum}>{item.slot_number}</Text>
            <Text style={styles.slotSize}>{item.slot_size || ''}</Text>
          </View>
        )}
      />
    </View>
  );
}

function SummaryCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <View style={[styles.summaryCard, { borderTopColor: color }]}>
      <Text style={[styles.summaryCount, { color }]}>{count}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  title: { fontSize: 18, fontWeight: '800', color: '#1F2937', padding: 16, paddingBottom: 8 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginBottom: 12 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 99, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#fff' },
  filterActive: { borderColor: '#7C3AED', backgroundColor: '#F5F3FF' },
  filterText: { fontSize: 12, color: '#6B7280' },
  filterActiveText: { color: '#7C3AED', fontWeight: '700' },
  summaryRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 10, marginBottom: 12 },
  summaryCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center',
    borderTopWidth: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  summaryCount: { fontSize: 22, fontWeight: '800' },
  summaryLabel: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  grid: { paddingHorizontal: 12, paddingBottom: 24 },
  slot: {
    flex: 1, margin: 4, borderRadius: 10, padding: 10, minHeight: 70,
    justifyContent: 'center', alignItems: 'center',
  },
  slotNum: { fontWeight: '800', fontSize: 15, color: '#1F2937' },
  slotSize: { fontSize: 11, color: '#6B7280', marginTop: 2 },
});
