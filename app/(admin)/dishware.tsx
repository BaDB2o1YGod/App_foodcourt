import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, RefreshControl } from 'react-native';
import { dishwareAPI } from '../../services/api';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function AdminDishware() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('PENDING');

  const fetchData = async () => {
    try {
      const res = await dishwareAPI.getAll();
      setOrders(res.data.data || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData().finally(() => setLoading(false)); }, []);

  const filtered = filter === 'ALL' ? orders : orders.filter((o) => o.status === filter);

  const handleApprove = async (id: number) => {
    try {
      await dishwareAPI.approve(id);
      Alert.alert('อนุมัติ', 'อนุมัติคำสั่งซื้อเรียบร้อย');
      await fetchData();
    } catch (e: any) { Alert.alert('ผิดพลาด', e?.response?.data?.message || 'ไม่สามารถอนุมัติได้'); }
  };

  const handleReject = (id: number) => {
    Alert.prompt('ปฏิเสธ', 'กรอกเหตุผล:', async (reason) => {
      if (!reason) return;
      try {
        await dishwareAPI.reject(id, { reject_reason: reason });
        Alert.alert('ปฏิเสธ', 'ปฏิเสธคำสั่งซื้อแล้ว');
        await fetchData();
      } catch (e: any) { Alert.alert('ผิดพลาด', e?.response?.data?.message || 'ไม่สามารถปฏิเสธได้'); }
    });
  };

  if (loading) return <LoadingSpinner />;

  return (
    <View style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map((f) => (
          <TouchableOpacity key={f} style={[styles.filterBtn, filter === f && styles.filterActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, filter === f && styles.filterActiveText]}>
              {f === 'PENDING' ? 'รออนุมัติ' : f === 'APPROVED' ? 'อนุมัติแล้ว' : f === 'REJECTED' ? 'ปฏิเสธ' : 'ทั้งหมด'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await fetchData(); setRefreshing(false); }} colors={['#DC2626']} />}
      >
        {filtered.map((order) => (
          <View key={order.usage_id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.orderDate}>
                {new Date(order.usage_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
              <StatusBadge status={order.status} size="sm" />
            </View>
            <Text style={styles.tenant}>👤 {order.recorder?.first_name} {order.recorder?.last_name}</Text>
            {order.items?.map((item: any) => (
              <Text key={item.item_id} style={styles.item}>
                • {item.dishware_type?.name} × {item.quantity} = ฿{Number(item.subtotal).toLocaleString()}
              </Text>
            ))}
            <Text style={styles.total}>฿{Number(order.total_cost).toLocaleString()}</Text>
            {order.status === 'PENDING' && (
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(order.usage_id)}>
                  <Text style={styles.approveTxt}>✅ อนุมัติ</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(order.usage_id)}>
                  <Text style={styles.rejectTxt}>❌ ปฏิเสธ</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
        {filtered.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🍽</Text>
            <Text style={styles.emptyText}>ไม่มีคำสั่งซื้อ</Text>
          </View>
        )}
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
  orderDate: { fontSize: 13, fontWeight: '600', color: '#374151' },
  tenant: { fontSize: 12, color: '#6B7280', marginBottom: 6 },
  item: { fontSize: 13, color: '#374151', marginBottom: 2 },
  total: { fontSize: 16, fontWeight: '800', color: '#7C3AED', marginTop: 8 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  approveBtn: { flex: 1, backgroundColor: '#D1FAE5', borderRadius: 8, padding: 10, alignItems: 'center' },
  approveTxt: { color: '#065F46', fontWeight: '700' },
  rejectBtn: { flex: 1, backgroundColor: '#FEE2E2', borderRadius: 8, padding: 10, alignItems: 'center' },
  rejectTxt: { color: '#991B1B', fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyText: { color: '#9CA3AF' },
});
