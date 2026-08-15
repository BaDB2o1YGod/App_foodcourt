import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import StatusBadge from '../../components/ui/StatusBadge';
import { contractsAPI } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function CancellationRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await contractsAPI.getCancellationRequests();
      setRequests(res.data.data || []);
    } catch (e) {
      console.warn('Failed to fetch cancellation requests:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  const handleUpdateStatus = (id: number, status: string, statusLabel: string) => {
    Alert.alert(
      `ยืนยันการ${statusLabel}`,
      `คุณต้องการ${statusLabel}คำร้องขอยกเลิกสัญญานี้หรือไม่?`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ยืนยัน',
          style: status === 'REJECTED' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await contractsAPI.updateCancellationStatus(id, status);
              fetchRequests();
            } catch (e: any) {
              Alert.alert('ผิดพลาด', e?.response?.data?.message || `ไม่สามารถ${statusLabel}คำร้องได้`);
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.title}>ขอยกเลิก: {item.cancellation_reason}</Text>
          <Text style={styles.subtitle}>รหัสสัญญา: #{item.contract_id}</Text>
        </View>
        <StatusBadge status={item.status} size="sm" />
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="person" size={16} color="#6B7280" />
        <Text style={styles.infoText}>ผู้เช่า ID: {item.tenant_id}</Text>
      </View>

      {item.cancellation_note ? (
        <View style={styles.infoRow}>
          <Ionicons name="document-text" size={16} color="#6B7280" />
          <Text style={styles.infoText}>เพิ่มเติม: {item.cancellation_note}</Text>
        </View>
      ) : null}

      <View style={styles.infoRow}>
        <Ionicons name="calendar" size={16} color="#6B7280" />
        <Text style={styles.infoText}>วันที่ขอ: {new Date(item.cancellation_requested_at || Date.now()).toLocaleDateString('th-TH')}</Text>
      </View>

      {item.status === 'PENDING_TERMINATION' && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.rejectBtn]}
            onPress={() => handleUpdateStatus(item.contract_id, 'REJECTED', 'ปฏิเสธ')}
          >
            <Ionicons name="close-circle" size={18} color="#EF4444" />
            <Text style={styles.rejectBtnText}>ปฏิเสธ</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.approveBtn]}
            onPress={() => handleUpdateStatus(item.contract_id, 'APPROVED', 'อนุมัติ')}
          >
            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            <Text style={styles.approveBtnText}>อนุมัติ</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (loading) return <LoadingSpinner message="กำลังโหลดคำร้อง..." />;

  return (
    <View style={styles.container}>
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>ไม่มีรายการคำร้องขอยกเลิกสัญญา</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  listContent: { padding: 16 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  headerTitleContainer: { flex: 1, marginRight: 10 },
  title: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 2 },
  subtitle: { fontSize: 12, color: '#6B7280' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, paddingRight: 10 },
  infoText: { fontSize: 14, color: '#4B5563', marginLeft: 8, flex: 1 },
  actionRow: {
    flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 16, gap: 12
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1 },
  rejectBtn: { borderColor: '#FECACA', backgroundColor: '#FEF2F2' },
  rejectBtnText: { color: '#EF4444', fontWeight: '600', marginLeft: 6, fontSize: 14 },
  approveBtn: { borderColor: '#A7F3D0', backgroundColor: '#ECFDF5' },
  approveBtnText: { color: '#10B981', fontWeight: '600', marginLeft: 6, fontSize: 14 },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#6B7280', marginTop: 12, fontSize: 16 },
});
