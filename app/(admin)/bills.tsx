import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, RefreshControl, Modal, Image, Dimensions } from 'react-native';
import { billsAPI } from '../../services/api';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';

export default function AdminBills() {
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { filter: initialFilter } = useLocalSearchParams<{ filter?: string }>();
  const [filter, setFilter] = useState(initialFilter || 'ALL');
  
  // Modal states
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);

  const fetchData = async () => {
    try {
      const res = await billsAPI.getAll();
      setBills(res.data.data || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData().finally(() => setLoading(false)); }, []);

  const filtered = filter === 'ALL' ? bills : bills.filter((b) => b.status === filter);

  const handleVerify = async (paymentId: number, approved: boolean = true) => {
    try {
      await billsAPI.verifyPayment(paymentId, { approved, notes: approved ? 'ยืนยันโดยแอดมิน' : 'ปฏิเสธโดยแอดมิน' });
      Alert.alert('สำเร็จ', approved ? 'ยืนยันการชำระเงินเรียบร้อย' : 'ปฏิเสธหลักฐานการชำระเงินเรียบร้อย');
      setSelectedBill(null);
      setSelectedPayment(null);
      await fetchData();
    } catch (e: any) {
      Alert.alert('ผิดพลาด', e?.response?.data?.message || 'ไม่สามารถทำรายการได้');
    }
  };

  const openSlipViewer = (bill: any, payment: any) => {
    setSelectedBill(bill);
    setSelectedPayment(payment);
  };

  const handleManualApprove = (expenseId: number) => {
    Alert.alert('ยืนยันรับชำระ', 'ต้องการเปลี่ยนสถานะบิลนี้เป็น "ชำระแล้ว" ใช่หรือไม่? (กรณีรับเงินสด/โอนตรง)', [
      { text: 'ยกเลิก', style: 'cancel' },
      { 
        text: 'ยืนยัน', 
        onPress: async () => {
          try {
            await billsAPI.update(expenseId, { status: 'PAID' });
            Alert.alert('สำเร็จ', 'อัปเดตสถานะบิลเรียบร้อย');
            await fetchData();
          } catch (e: any) {
            Alert.alert('ผิดพลาด', e?.response?.data?.message || 'ไม่สามารถอัปเดตสถานะได้');
          }
        }
      }
    ]);
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
        {filtered.map((bill) => {
          const unverifiedPayments = (bill.payments || []).filter((p: any) => !p.verified_at);
          
          return (
            <View key={bill.expense_id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.month}>
                  {new Date(bill.billing_month).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
                </Text>
                <StatusBadge status={bill.status} size="sm" />
              </View>
              <Text style={styles.tenant}>
                <Ionicons name="person" size={14} color="#6B7280" /> {bill.contract?.tenant?.first_name} {bill.contract?.tenant?.last_name} — ล็อก {bill.contract?.slot?.slot_number}
              </Text>
              <Text style={styles.amount}>฿{Number(bill.total_amount || 0).toLocaleString()}</Text>
              
              {/* Payment Slip Viewer Button (Always show if payment exists) */}
              {(bill.payments && bill.payments.length > 0) ? (
                bill.payments.map((p: any) => (
                  <TouchableOpacity 
                    key={p.payment_id} 
                    style={[styles.verifyBtn, p.verified_at ? { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#D1D5DB' } : {}]} 
                    onPress={() => openSlipViewer(bill, p)}
                  >
                    <AntDesign name={p.verified_at ? "picture" : "search"} size={18} color={p.verified_at ? '#4B5563' : '#1D4ED8'} />
                    <Text style={[styles.verifyText, p.verified_at ? { color: '#4B5563' } : {}]}>
                      {p.verified_at ? 'ดูสลิป (ตรวจสอบแล้ว)' : 'ตรวจสอบสลิปโอนเงิน'}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : bill.status === 'PENDING' ? (
                <View style={[styles.verifyBtn, { backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A' }]}>
                  <Ionicons name="time-outline" size={18} color="#92400E" />
                  <Text style={[styles.verifyText, { color: '#92400E' }]}>รอผู้เช่าส่งหลักฐานการชำระเงิน</Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>

      {/* Slip Viewer Modal */}
      <Modal visible={!!selectedPayment} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>ตรวจสอบการชำระเงิน</Text>
              <TouchableOpacity onPress={() => setSelectedPayment(null)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent}>
              {selectedBill && (
                <View style={styles.billSummary}>
                  <Text style={styles.billSummaryText}>บิลประจำเดือน {new Date(selectedBill.billing_month).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}</Text>
                  <Text style={styles.billSummaryText}>ล็อก {selectedBill.contract?.slot?.slot_number} - {selectedBill.contract?.tenant?.first_name}</Text>
                  <Text style={styles.billSummaryValue}>ยอดชำระ: ฿{Number(selectedBill.total_amount).toLocaleString()}</Text>
                </View>
              )}

              {selectedPayment?.payment_slip_url ? (
                <Image 
                  source={{ uri: selectedPayment.payment_slip_url }} 
                  style={styles.slipImage} 
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.noSlip}>
                  <Text style={styles.noSlipText}>ไม่มีไฟล์แนบ</Text>
                </View>
              )}
            </ScrollView>

            {/* Only show action buttons if not yet verified */}
            {!selectedPayment?.verified_at && (
              <View style={styles.actionRow}>
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.actionReject]} 
                  onPress={() => handleVerify(selectedPayment.payment_id, false)}
                >
                  <Text style={[styles.actionBtnText, styles.actionRejectText]}>❌ ไม่อนุมัติ</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.actionApprove]} 
                  onPress={() => handleVerify(selectedPayment.payment_id, true)}
                >
                  <Text style={[styles.actionBtnText, styles.actionApproveText]}>✅ อนุมัติ</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  filterScroll: { paddingHorizontal: 18, paddingBottom: 2, paddingTop: 10, flexGrow: 0 },
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
  verifyBtn: { backgroundColor: '#DBEAFE', borderRadius: 8, padding: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  verifyText: { color: '#1D4ED8', fontWeight: '700', fontSize: 13 },
  
  /* Modal Styles */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: Dimensions.get('window').height * 0.8 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1F2937' },
  closeBtn: { padding: 4 },
  closeBtnText: { fontSize: 20, color: '#6B7280' },
  modalContent: { padding: 16 },
  billSummary: { backgroundColor: '#F9FAFB', padding: 14, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#F3F4F6' },
  billSummaryText: { fontSize: 13, color: '#4B5563', marginBottom: 4 },
  billSummaryValue: { fontSize: 16, fontWeight: '700', color: '#DC2626', marginTop: 4 },
  slipImage: { width: '100%', height: 400, backgroundColor: '#F3F4F6', borderRadius: 12 },
  noSlip: { width: '100%', height: 300, backgroundColor: '#F3F4F6', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  noSlipText: { color: '#9CA3AF' },
  actionRow: { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB', backgroundColor: '#fff' },
  actionBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  actionReject: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FCA5A5' },
  actionRejectText: { color: '#DC2626' },
  actionApprove: { backgroundColor: '#16A34A' },
  actionApproveText: { color: '#fff' },
  actionBtnText: { fontSize: 15, fontWeight: '700' },
});
