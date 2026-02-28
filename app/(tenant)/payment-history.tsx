import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, Image } from 'react-native';
import { billsAPI } from '../../services/api';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function PaymentHistory() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const res = await billsAPI.getHistory();
      setHistory(res.data.data || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData().finally(() => setLoading(false)); }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await fetchData(); setRefreshing(false); }} colors={['#7C3AED']} />}
    >
      {history.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🧾</Text>
          <Text style={styles.emptyText}>ยังไม่มีประวัติการชำระเงิน</Text>
        </View>
      ) : (
        history.map((item) => (
          <View key={item.payment_id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.payDate}>
                {new Date(item.payment_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
              <Text style={styles.amount}>฿{Number(item.payment_amount || 0).toLocaleString()}</Text>
            </View>
            {item.notes && <Text style={styles.notes}>{item.notes}</Text>}
            {item.verified_at && (
              <View style={styles.verifiedRow}>
                <Text style={styles.verifiedIcon}>✅</Text>
                <Text style={styles.verifiedText}>
                  ยืนยันเมื่อ {new Date(item.verified_at).toLocaleDateString('th-TH')}
                </Text>
              </View>
            )}
            {item.payment_slip_url && (
              <Image
                source={{ uri: item.payment_slip_url }}
                style={styles.slip}
                resizeMode="cover"
              />
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6', padding: 16 },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  payDate: { fontSize: 14, color: '#374151', fontWeight: '600', flex: 1, marginRight: 8 },
  amount: { fontSize: 16, fontWeight: '800', color: '#7C3AED' },
  notes: { color: '#6B7280', fontSize: 13, marginTop: 6 },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 },
  verifiedIcon: { fontSize: 14 },
  verifiedText: { color: '#059669', fontSize: 13, fontWeight: '500' },
  slip: { marginTop: 10, width: '100%', height: 180, borderRadius: 10 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#9CA3AF', fontSize: 15 },
});
