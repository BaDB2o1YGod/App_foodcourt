import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { billsAPI } from '../../services/api';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function ExecutiveBills() {
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try { const res = await billsAPI.getAll(); setBills(res.data.data || []); }
    catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData().finally(() => setLoading(false)); }, []);

  const total = bills.reduce((sum, b) => sum + Number(b.total_amount || 0), 0);
  const pending = bills.filter((b) => b.status === 'PENDING').length;

  if (loading) return <LoadingSpinner />;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await fetchData(); setRefreshing(false); }} colors={['#059669']} />}
    >
      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.sumCard}><Text style={styles.sumCount}>{bills.length}</Text><Text style={styles.sumLabel}>บิลทั้งหมด</Text></View>
        <View style={[styles.sumCard, { borderTopColor: '#F59E0B' }]}><Text style={[styles.sumCount, { color: '#F59E0B' }]}>{pending}</Text><Text style={styles.sumLabel}>รอชำระ</Text></View>
        <View style={[styles.sumCard, { borderTopColor: '#7C3AED' }]}><Text style={[styles.sumCount, { color: '#7C3AED' }]}>฿{Math.round(total / 1000)}K</Text><Text style={styles.sumLabel}>ยอดรวม</Text></View>
      </View>
      {/* List */}
      {bills.map((bill) => (
        <View key={bill.expense_id} style={styles.card}>
          <View style={styles.cardRow}>
            <Text style={styles.month}>
              {new Date(bill.billing_month).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
            </Text>
            <StatusBadge status={bill.status} size="sm" />
          </View>
          <Text style={styles.amount}>฿{Number(bill.total_amount || 0).toLocaleString()}</Text>
          <Text style={styles.meta}>ล็อก {bill.contract?.slot?.slot_number} — {bill.contract?.tenant?.first_name}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6', padding: 12 },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  sumCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center', borderTopWidth: 3, borderTopColor: '#059669', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  sumCount: { fontSize: 18, fontWeight: '800', color: '#059669' },
  sumLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  month: { fontSize: 13, fontWeight: '600', color: '#374151' },
  amount: { fontSize: 16, fontWeight: '800', color: '#7C3AED' },
  meta: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
});
