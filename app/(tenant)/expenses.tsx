import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { billsAPI } from '../../services/api';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function Expenses() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const res = await billsAPI.getAll();
      setExpenses(res.data.data || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData().finally(() => setLoading(false)); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7C3AED']} />}
    >
      {expenses.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyText}>ยังไม่มีข้อมูลค่าใช้จ่าย</Text>
        </View>
      ) : (
        expenses.map((exp) => (
          <View key={exp.expense_id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.month}>
                {new Date(exp.billing_month).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
              </Text>
              <StatusBadge status={exp.status} size="sm" />
            </View>
            <View style={styles.rows}>
              <Row label="ค่าเช่า" value={exp.rent_amount} />
              <Row label="ค่าน้ำ" value={exp.water_cost} />
              <Row label="ค่าไฟ" value={exp.electricity_cost} />
            </View>
            <View style={styles.total}>
              <Text style={styles.totalLabel}>รวมทั้งหมด</Text>
              <Text style={styles.totalValue}>฿{Number(exp.total_amount || 0).toLocaleString()}</Text>
            </View>
            <Text style={styles.dueDate}>
              ครบกำหนด: {new Date(exp.due_date).toLocaleDateString('th-TH')}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
      <Text style={{ color: '#6B7280', fontSize: 14 }}>{label}</Text>
      <Text style={{ color: '#1F2937', fontSize: 14 }}>฿{Number(value || 0).toLocaleString()}</Text>
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
  month: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  rows: { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 10, marginBottom: 10 },
  total: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#F5F3FF', borderRadius: 10, padding: 10,
  },
  totalLabel: { fontWeight: '700', color: '#7C3AED' },
  totalValue: { fontWeight: '800', fontSize: 16, color: '#7C3AED' },
  dueDate: { color: '#9CA3AF', fontSize: 12, marginTop: 8 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#9CA3AF', fontSize: 15 },
});
