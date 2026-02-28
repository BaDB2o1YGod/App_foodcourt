import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, TextInput,
} from 'react-native';
import { dishwareAPI, dishwareTypeAPI } from '../../services/api';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function TenantDishware() {
  const [types, setTypes] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [typesRes, ordersRes] = await Promise.all([
          dishwareTypeAPI.getAll({ is_active: true }),
          dishwareAPI.getAll(),
        ]);
        setTypes(typesRes.data.data || []);
        setOrders(ordersRes.data.data || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const updateQty = (id: number, delta: number) => {
    setQuantities((prev) => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [id]: next };
    });
  };

  const totalCost = types.reduce((sum, t) => sum + (quantities[t.dishware_type_id] || 0) * t.unit_price, 0);

  const handleOrder = async () => {
    const items = types
      .filter((t) => (quantities[t.dishware_type_id] || 0) > 0)
      .map((t) => ({ dishware_type_id: t.dishware_type_id, quantity: quantities[t.dishware_type_id] }));
    if (items.length === 0) { Alert.alert('แจ้งเตือน', 'กรุณาเลือกภาชนะก่อน'); return; }
    setSubmitting(true);
    try {
      await dishwareAPI.create({ items, usage_date: new Date().toISOString() });
      Alert.alert('สำเร็จ', 'สั่งซื้อภาชนะเรียบร้อยแล้ว รอการอนุมัติจากแอดมิน');
      setQuantities({});
      const res = await dishwareAPI.getAll();
      setOrders(res.data.data || []);
    } catch (e: any) {
      Alert.alert('ผิดพลาด', e?.response?.data?.message || 'ไม่สามารถสั่งซื้อได้');
    } finally { setSubmitting(false); }
  };

  if (loading) return <LoadingSpinner />;

  const CATEGORY_ICON: Record<string, string> = { PLATE: '🍽', BOWL: '🥣', CUP: '☕', OTHER: '📦' };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>เลือกภาชนะ</Text>
        {types.map((t) => (
          <View key={t.dishware_type_id} style={styles.typeCard}>
            <View style={styles.typeInfo}>
              <Text style={styles.typeIcon}>{CATEGORY_ICON[t.category] || '📦'}</Text>
              <View>
                <Text style={styles.typeName}>{t.name}</Text>
                <Text style={styles.typePrice}>฿{Number(t.unit_price).toLocaleString()} / ชิ้น</Text>
              </View>
            </View>
            <View style={styles.qtyRow}>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(t.dishware_type_id, -1)}>
                <Text style={styles.qtyBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.qtyNum}>{quantities[t.dishware_type_id] || 0}</Text>
              <TouchableOpacity style={[styles.qtyBtn, styles.qtyBtnPlus]} onPress={() => updateQty(t.dishware_type_id, 1)}>
                <Text style={[styles.qtyBtnText, { color: '#fff' }]}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        {/* Total */}
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>ยอดรวม</Text>
          <Text style={styles.totalValue}>฿{totalCost.toLocaleString()}</Text>
        </View>
        <TouchableOpacity
          style={[styles.orderBtn, submitting && { opacity: 0.6 }]}
          onPress={handleOrder}
          disabled={submitting}
        >
          <Text style={styles.orderBtnText}>{submitting ? 'กำลังส่งคำสั่งซื้อ...' : '🛒 ยืนยันสั่งซื้อ'}</Text>
        </TouchableOpacity>
      </View>

      {/* History */}
      <Text style={styles.sectionTitle2}>ประวัติคำสั่งซื้อ</Text>
      {orders.map((order) => (
        <View key={order.usage_id} style={styles.orderCard}>
          <View style={styles.orderHeader}>
            <Text style={styles.orderDate}>{new Date(order.usage_date).toLocaleDateString('th-TH')}</Text>
            <StatusBadge status={order.status} size="sm" />
          </View>
          <Text style={styles.orderTotal}>฿{Number(order.total_cost).toLocaleString()}</Text>
          {order.reject_reason && <Text style={styles.rejectReason}>เหตุผล: {order.reject_reason}</Text>}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  section: { margin: 16, backgroundColor: '#fff', borderRadius: 16, padding: 16, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 14 },
  sectionTitle2: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginHorizontal: 16, marginTop: 4, marginBottom: 8 },
  typeCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  typeInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  typeIcon: { fontSize: 28 },
  typeName: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  typePrice: { fontSize: 12, color: '#7C3AED', marginTop: 2 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: 1.5, borderColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' },
  qtyBtnPlus: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  qtyBtnText: { fontSize: 18, fontWeight: '700', color: '#374151', lineHeight: 22 },
  qtyNum: { fontSize: 16, fontWeight: '700', color: '#1F2937', minWidth: 24, textAlign: 'center' },
  totalBox: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, padding: 12, backgroundColor: '#F5F3FF', borderRadius: 10 },
  totalLabel: { fontWeight: '700', color: '#7C3AED' },
  totalValue: { fontWeight: '800', fontSize: 16, color: '#7C3AED' },
  orderBtn: { backgroundColor: '#7C3AED', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 12 },
  orderBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  orderCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginHorizontal: 16, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  orderDate: { fontSize: 14, fontWeight: '600', color: '#374151' },
  orderTotal: { fontSize: 16, fontWeight: '800', color: '#7C3AED' },
  rejectReason: { fontSize: 12, color: '#EF4444', marginTop: 6 },
});
