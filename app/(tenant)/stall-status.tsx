import { useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { stallsAPI } from '../../services/api';

export default function StallStatus() {
  const { food_court_id, foodCourt } = useLocalSearchParams();
  const initialFcParam = food_court_id || foodCourt;
  const [selectedFC, setSelectedFC] = useState<number>(initialFcParam ? Number(initialFcParam) : 1);

  // Update selectedFC if navigated with a new parameter
  useEffect(() => {
    if (food_court_id || foodCourt) {
      setSelectedFC(Number(food_court_id || foodCourt));
    }
  }, [food_court_id, foodCourt]);

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
        if (!existing || (!hasActive(existing) && hasActive(s))) {
          map.set(key, s);
        }
      }

      const uniqueStalls = Array.from(map.values());
      uniqueStalls.sort((a, b) =>
        a.slot_number.localeCompare(b.slot_number, undefined, { numeric: true, sensitivity: 'base' })
      );
      setStalls(uniqueStalls);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
  }, []);

  /* มีสัญญา ACTIVE = มีผู้เช่า */
  const hasActiveContract = (stall: any) =>
    stall.rental_contracts?.some((c: any) => c.status === 'ACTIVE');

  /* สีพาสเทล: แดงอ่อน = มีสัญญา (ไม่ว่าง), เขียวอ่อน = ว่าง */
  const slotBg = (stall: any) =>
    hasActiveContract(stall) ? '#FECACA' : '#BBF7D0';

  /* อ่านข้อมูลอย่างเดียว (Read-Only) — ไม่มีปุ่มแก้ไขหรือจัดการ */
  const handlePress = (stall: any) => {
    const occupied = hasActiveContract(stall);
    Alert.alert(
      `🏪 ล็อก ${stall.slot_number}`,
      occupied
        ? `สถานะ: ไม่ว่าง (มีผู้เช่า)\nค่าเช่า: ฿${Number(stall.rent || 0).toLocaleString()}\nขนาด: ${stall.slot_size || '-'}`
        : `สถานะ: ว่าง\nค่าเช่า: ฿${Number(stall.rent || 0).toLocaleString()}\nขนาด: ${stall.slot_size || '-'}`,
      [{ text: 'ปิด', style: 'cancel' }]
    );
  };

  const filteredStalls = stalls.filter((s) => s.food_court_id === selectedFC);
  const occupied = filteredStalls.filter(hasActiveContract);
  const vacant   = filteredStalls.filter((s) => !hasActiveContract(s));

  if (loading) return <LoadingSpinner message="กำลังโหลด..." />;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await fetchData();
            setRefreshing(false);
          }}
          colors={['#7C3AED']}
        />
      }
    >
      {/* FC Filter */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterBtn, selectedFC === 1 && styles.filterActive]}
          onPress={() => setSelectedFC(1)}
        >
          <Text style={[styles.filterText, selectedFC === 1 && styles.filterActiveText]}>
            ศูนย์อาหาร 1
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, selectedFC === 2 && styles.filterActive]}
          onPress={() => setSelectedFC(2)}
        >
          <Text style={[styles.filterText, selectedFC === 2 && styles.filterActiveText]}>
            ศูนย์อาหาร 2
          </Text>
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
          <Text style={styles.summaryCount}>{filteredStalls.length}</Text>
          <Text style={styles.summaryLabel}>ทั้งหมด</Text>
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#FECACA' }]} />
          <Text style={styles.legendText}>มีผู้เช่า</Text>
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
          return (
            <TouchableOpacity
              key={st.slot_id}
              style={[styles.slot, { backgroundColor: bg }]}
              onPress={() => handlePress(st)}
              activeOpacity={0.7}
            >
              <Text style={styles.slotNum}>{st.slot_number}</Text>
              {st.slot_size ? <Text style={styles.slotSize}>{st.slot_size}</Text> : null}
              <Text style={styles.slotRent}>฿{Number(st.rent || 0).toLocaleString()}</Text>
              {isOccupied ? (
                <Text style={styles.slotTenant} numberOfLines={1}>
                  ไม่ว่าง
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

  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 16, gap: 8 },
  filterBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  filterActive: { backgroundColor: '#F5F3FF', borderWidth: 1, borderColor: '#7C3AED' },
  filterText: { fontSize: 13, color: '#4B5563', fontWeight: '500' },
  filterActiveText: { color: '#7C3AED', fontWeight: '700' },

  summaryRow: { flexDirection: 'row', gap: 10, padding: 16 },
  summaryCard: { flex: 1, borderRadius: 14, padding: 12, alignItems: 'center' },
  summaryCount: { fontSize: 24, fontWeight: '800', color: '#1F2937' },
  summaryLabel: { fontSize: 12, color: '#6B7280', marginTop: 2 },

  legend: { flexDirection: 'row', gap: 16, paddingHorizontal: 16, marginBottom: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { fontSize: 12, color: '#6B7280' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8, justifyContent: 'center' },
  slot: {
    width: '30%',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  slotNum: { fontSize: 14, fontWeight: '800', color: '#1F2937' },
  slotSize: { fontSize: 10, color: '#6B7280', marginTop: 1 },
  slotRent: { fontSize: 11, color: '#7C3AED', marginTop: 2, fontWeight: '600' },
  slotTenant: { fontSize: 10, color: '#991B1B', marginTop: 3, fontWeight: '600' },
  slotVacant: { fontSize: 10, color: '#166534', marginTop: 3 },
});

