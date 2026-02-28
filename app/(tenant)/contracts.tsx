import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { contractsAPI } from '../../services/api';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function Contracts() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const res = await contractsAPI.getAll();
      setContracts(res.data.data || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData().finally(() => setLoading(false)); }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await fetchData(); setRefreshing(false); }} colors={['#7C3AED']} />}
    >
      {contracts.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📄</Text>
          <Text style={styles.emptyText}>ไม่พบข้อมูลสัญญาเช่า</Text>
        </View>
      ) : (
        contracts.map((c) => (
          <View key={c.contract_id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.contractNum}>สัญญา #{c.contract_number}</Text>
              <StatusBadge status={c.status} size="sm" />
            </View>
            <View style={styles.rows}>
              <InfoRow label="ล็อก" value={`${c.slot?.slot_number || '-'}`} />
              <InfoRow label="เริ่มสัญญา" value={new Date(c.start_date).toLocaleDateString('th-TH')} />
              <InfoRow label="สิ้นสุดสัญญา" value={new Date(c.end_date).toLocaleDateString('th-TH')} />
              <InfoRow label="ค่าเช่ารายเดือน" value={`฿${Number(c.monthly_rent || 0).toLocaleString()}`} />
              <InfoRow label="เงินมัดจำ" value={`฿${Number(c.deposit_amount || 0).toLocaleString()}`} />
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' }}>
      <Text style={{ color: '#6B7280', fontSize: 14 }}>{label}</Text>
      <Text style={{ color: '#1F2937', fontSize: 14, fontWeight: '500' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6', padding: 16 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  contractNum: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  rows: {},
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#9CA3AF', fontSize: 15 },
});
