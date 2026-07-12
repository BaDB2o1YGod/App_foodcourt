import { useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { stallsAPI } from '../../services/api';

export default function AdminStalls() {
  const { food_court_id } = useLocalSearchParams();
  const [selectedFC, setSelectedFC] = useState<number>(food_court_id ? Number(food_court_id) : 1);

  // Update selectedFC if navigated to this tab with a new food_court_id param
  useEffect(() => {
    if (food_court_id) {
      setSelectedFC(Number(food_court_id));
    }
  }, [food_court_id]);

  const [stalls, setStalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const res = await stallsAPI.getAll();
      const raw: any[] = res.data.data || [];

      // De-duplicate by food_court_id + slot_number — prefer the entry with an ACTIVE contract
      const map = new Map<string, any>();
      for (const s of raw) {
        const key = `${s.food_court_id}_${s.slot_number}`;
        const existing = map.get(key);
        const hasActive = (x: any) =>
          x.rental_contracts?.some((c: any) => c.status === 'ACTIVE');
        // Keep this entry if it has an active contract OR no existing entry yet
        if (!existing || (!hasActive(existing) && hasActive(s))) {
          map.set(key, s);
        }
      }

      const uniqueStalls = Array.from(map.values());
      uniqueStalls.sort((a, b) => 
        a.slot_number.localeCompare(b.slot_number, undefined, { numeric: true, sensitivity: 'base' })
      );
      setStalls(uniqueStalls);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData().finally(() => setLoading(false)); }, []);

  /* มีสัญญา ACTIVE = มีผู้เช่า */
  const hasActiveContract = (stall: any) =>
    stall.rental_contracts?.some((c: any) => c.status === 'ACTIVE');

  /* สีพาสเทล: แดงอ่อน = มีสัญญา, เขียวอ่อน = ว่าง */
  const slotBg = (stall: any) =>
    hasActiveContract(stall) ? '#FECACA' : '#BBF7D0'; // red-200 / green-200 (pastel)

  /* Action sheet เมื่อกดล็อก */
  const handlePress = (stall: any) => {
    const occupied = hasActiveContract(stall);
    Alert.alert(
      `🏪 ล็อก ${stall.slot_number}`,
      occupied
        ? `ผู้เช่า: ${stall.rental_contracts[0]?.tenant?.first_name ?? '-'} ${stall.rental_contracts[0]?.tenant?.last_name ?? ''}`
        : 'ล็อกว่าง',
      [
        ...(occupied
          ? [{
              text: 'ออกบิลรายเดือน',
              onPress: () =>
                router.push({
                  pathname: '/(admin)/monthly-billing',
                  params: { slot_id: stall.slot_id, slot_number: stall.slot_number },
                }),
            }]
          : []),
        {
          text: 'เปลี่ยนสถานะ',
          onPress: () => changeStatus(stall),
        },
        { text: 'ยกเลิก', style: 'cancel' },
      ]
    );
  };

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

  const filteredStalls = stalls.filter((s) => s.food_court_id === selectedFC);
  const occupied = filteredStalls.filter(hasActiveContract);
  const vacant   = filteredStalls.filter((s) => !hasActiveContract(s));

  if (loading) return <LoadingSpinner />;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => { setRefreshing(true); await fetchData(); setRefreshing(false); }}
          colors={['#DC2626']}
        />
      }
    >
      {/* FC Filter */}
      <View style={styles.filterRow}>
        <TouchableOpacity style={[styles.filterBtn, selectedFC === 1 && styles.filterActive]} onPress={() => setSelectedFC(1)}>
          <Text style={[styles.filterText, selectedFC === 1 && styles.filterActiveText]}>ศูนย์อาหาร 1</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.filterBtn, selectedFC === 2 && styles.filterActive]} onPress={() => setSelectedFC(2)}>
          <Text style={[styles.filterText, selectedFC === 2 && styles.filterActiveText]}>ศูนย์อาหาร 2</Text>
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: '#FEE2E2' }]}>
          <Text style={styles.summaryCount}>{occupied.length}</Text>
          <Text style={styles.summaryLabel}>มีผู้เช่า</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#DCFCE7' }]}>
          <Text style={styles.summaryCount}>{vacant.length}</Text>
          <Text style={styles.summaryLabel}>ว่าง</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#F3F4F6' }]}>
          <Text style={styles.summaryCount}>{stalls.length}</Text>
          <Text style={styles.summaryLabel}>ทั้งหมด</Text>
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#FECACA' }]} />
          <Text style={styles.legendText}>มีสัญญาเช่า</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#BBF7D0' }]} />
          <Text style={styles.legendText}>ว่าง / ไม่มีสัญญา</Text>
        </View>
      </View>

      {/* Grid */}
      <View style={styles.grid}>
        {filteredStalls.map((st) => {
          const bg = slotBg(st);
          const isOccupied = hasActiveContract(st);
          const tenant = st.rental_contracts?.[0]?.tenant;
          return (
            <TouchableOpacity
              key={st.slot_id}
              style={[styles.slot, { backgroundColor: bg }]}
              onPress={() => handlePress(st)}
            >
              <Text style={styles.slotNum}>{st.slot_number}</Text>
              {st.slot_size ? <Text style={styles.slotSize}>{st.slot_size}</Text> : null}
              <Text style={styles.slotRent}>฿{Number(st.rent || 0).toLocaleString()}</Text>
              {isOccupied && tenant ? (
                <Text style={styles.slotTenant} numberOfLines={1}>
                  {tenant.first_name}
                </Text>
              ) : (
                <Text style={styles.slotVacant}>ว่าง</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },

  summaryRow: { flexDirection: 'row', gap: 10, padding: 16 },
  summaryCard: { flex: 1, borderRadius: 14, padding: 12, alignItems: 'center' },
  summaryCount: { fontSize: 24, fontWeight: '800', color: '#1F2937' },
  summaryLabel: { fontSize: 12, color: '#6B7280', marginTop: 2 },

  legend: { flexDirection: 'row', gap: 16, paddingHorizontal: 16, marginBottom: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { fontSize: 12, color: '#6B7280' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8 },
  slot: {
    width: '30%', borderRadius: 12, padding: 10, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  slotNum:    { fontSize: 14, fontWeight: '800', color: '#1F2937' },
  slotSize:   { fontSize: 10, color: '#6B7280', marginTop: 1 },
  slotRent:   { fontSize: 11, color: '#7C3AED', marginTop: 2, fontWeight: '600' },
  slotTenant: { fontSize: 10, color: '#991B1B', marginTop: 3, fontWeight: '600' },
  slotVacant: { fontSize: 10, color: '#166534', marginTop: 3 },

  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 16, gap: 8 },
  filterBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  filterActive: { backgroundColor: '#DBEAFE', borderWidth: 1, borderColor: '#3B82F6' },
  filterText: { fontSize: 13, color: '#4B5563', fontWeight: '500' },
  filterActiveText: { color: '#1D4ED8', fontWeight: '700' },
});
