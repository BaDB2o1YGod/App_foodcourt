import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, RefreshControl } from 'react-native';
import { billsAPI } from '../../services/api';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function AdminBills() {
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('ALL');

  const fetchData = async () => {
    try {
      const res = await billsAPI.getAll();
      setBills(res.data.data || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData().finally(() => setLoading(false)); }, []);

  const filtered = filter === 'ALL' ? bills : bills.filter((b) => b.status === filter);

  const handleVerify = async (paymentId: number) => {
    try {
      await billsAPI.verifyPayment(paymentId, { notes: 'ยืนยันโดยแอดมิน' });
      Alert.alert('สำเร็จ', 'ยืนยันการชำระเงินเรียบร้อย');
      await fetchData();
    } catch (e: any) {
      Alert.alert('ผิดพลาด', e?.response?.data?.message || 'ไม่สามารถยืนยันได้');
    }
  };

  if (loading) return <LoadingSpinner />;

  const FILTERS = ['ALL', 'PENDING', 'PAID', 'OVERDUE'];

  return (
    <View style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {FILTERS.map((f) => (
          <TouchableOpacity key={f} style={[styles.filterBtn, filter === f && styles.filterActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, filter === f && styles.filterActiveText]}>
              {f === 'ALL' ? 'ทั้งหมด' : f === 'PENDING' ? 'รอชำระ' : f === 'PAID' ? 'ชำระแล้ว' : 'เกินกำหนด'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await fetchData(); setRefreshing(false); }} colors={['#DC2626']} />}
      >
        {filtered.map((bill) => (
          <View key={bill.expense_id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.month}>
                {new Date(bill.billing_month).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
              </Text>
              <StatusBadge status={bill.status} size="sm" />
            </View>
            <Text style={styles.tenant}>
              👤 {bill.contract?.tenant?.first_name} {bill.contract?.tenant?.last_name} — ล็อก {bill.contract?.slot?.slot_number}
            </Text>
            <Text style={styles.amount}>฿{Number(bill.total_amount || 0).toLocaleString()}</Text>
            {/* Payments waiting for verify */}
            {bill.payments?.filter((p: any) => !p.verified_at).map((p: any) => (
              <TouchableOpacity key={p.payment_id} style={styles.verifyBtn} onPress={() => handleVerify(p.payment_id)}>
                <Text style={styles.verifyText}>✅ ยืนยันสลิปการชำระ</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  filterScroll: { paddingHorizontal: 12, paddingVertical: 10, flexGrow: 0 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, borderWidth: 1.5, borderColor: '#E5E7EB', marginRight: 8, backgroundColor: '#fff' },
  filterActive: { borderColor: '#DC2626', backgroundColor: '#FEF2F2' },
  filterText: { fontSize: 12, color: '#6B7280' },
  filterActiveText: { color: '#DC2626', fontWeight: '700' },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  month: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  tenant: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  amount: { fontSize: 18, fontWeight: '800', color: '#7C3AED', marginBottom: 8 },
  verifyBtn: { backgroundColor: '#D1FAE5', borderRadius: 8, padding: 10, alignItems: 'center' },
  verifyText: { color: '#065F46', fontWeight: '600', fontSize: 13 },
});
