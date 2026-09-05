import { AntDesign, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StatusBadge from '../../components/ui/StatusBadge';
import { billsAPI } from '../../services/api';

const THAI_MONTHS = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

export default function AdminBills() {
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { filter: initialFilter } = useLocalSearchParams<{ filter?: string }>();
  
  // Filters
  const [statusFilter, setStatusFilter] = useState(initialFilter || 'ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');

  // Modal states
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  
  // Month Picker Modal state
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
  const [pickerYear, setPickerYear] = useState<number>(new Date().getFullYear());

  const fetchData = async () => {
    try {
      const res = await billsAPI.getAll();
      setBills(res.data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
  }, []);

  // Extract unique months from bills
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    bills.forEach((b) => {
      if (b.billing_month) {
        // Format as YYYY-MM
        const d = new Date(b.billing_month);
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        months.add(ym);
      }
    });
    // Sort descending (newest first)
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [bills]);

  // Apply filters
  const filteredBills = useMemo(() => {
    let result = bills;

    // 1. Filter by status
    if (statusFilter !== 'ALL') {
      result = result.filter((b) => b.status === statusFilter);
    }

    // 2. Filter by month
    if (selectedMonth !== 'ALL') {
      result = result.filter((b) => {
        if (!b.billing_month) return false;
        const d = new Date(b.billing_month);
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return ym === selectedMonth;
      });
    }

    return result;
  }, [bills, statusFilter, selectedMonth]);

  const handleVerify = async (paymentId: number, approved: boolean = true) => {
    try {
      await billsAPI.verifyPayment(paymentId, {
        approved,
        notes: approved ? 'ยืนยันโดยแอดมิน' : 'ปฏิเสธโดยแอดมิน',
      });
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

  const openMonthPicker = () => {
    if (selectedMonth !== 'ALL') {
      const [y] = selectedMonth.split('-');
      setPickerYear(Number(y));
    } else {
      setPickerYear(new Date().getFullYear());
    }
    setMonthPickerVisible(true);
  };

  const handleSelectMonth = (monthIndex: number) => {
    const ym = `${pickerYear}-${String(monthIndex + 1).padStart(2, '0')}`;
    setSelectedMonth(ym);
    setMonthPickerVisible(false);
  };

  const handleSelectAllMonths = () => {
    setSelectedMonth('ALL');
    setMonthPickerVisible(false);
  };

  // Helper to format YYYY-MM to Thai month string
  const formatMonthLabel = (ym: string) => {
    if (ym === 'ALL') return 'ทุกเดือน';
    const [year, month] = ym.split('-');
    const d = new Date(Number(year), Number(month) - 1, 1);
    return d.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' });
  };

  if (loading) return <LoadingSpinner />;

  const STATUS_FILTERS = ['ALL', 'PENDING', 'PAID', 'OVERDUE'];

  return (
    <View style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
      {/* ─── Top Filter Bar ─── */}
      <View style={styles.topBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, alignItems: 'center' }}
        >
          {/* Month Picker Trigger */}
          <TouchableOpacity
            style={styles.monthDropdownBtn}
            onPress={openMonthPicker}
          >
            <Ionicons name="calendar-outline" size={16} color="#7C3AED" />
            <Text style={styles.monthDropdownText}>{formatMonthLabel(selectedMonth)}</Text>
            <Ionicons name="chevron-down" size={14} color="#7C3AED" />
          </TouchableOpacity>

          {/* Divider between month and status filters */}
          <View style={{ width: 1, height: 24, backgroundColor: '#E5E7EB', marginRight: 12 }} />

          {/* Status Filters */}
          {STATUS_FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterBtn, statusFilter === f && styles.filterActive]}
              onPress={() => setStatusFilter(f)}
            >
              <Text style={[styles.filterText, statusFilter === f && styles.filterActiveText]}>
                {f === 'ALL'
                  ? 'ทั้งหมด'
                  : f === 'PENDING'
                  ? 'รอชำระ'
                  : f === 'PAID'
                  ? 'ชำระแล้ว'
                  : 'เกินกำหนด'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ─── Bills List ─── */}
      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await fetchData();
              setRefreshing(false);
            }}
            colors={['#DC2626']}
          />
        }
      >
        {filteredBills.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>ไม่พบบิลในเงื่อนไขที่เลือก</Text>
          </View>
        ) : (
          filteredBills.map((bill) => {
            return (
              <View key={bill.expense_id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.month}>
                    {new Date(bill.billing_month).toLocaleDateString('th-TH', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                  <StatusBadge status={bill.status} size="sm" />
                </View>
                <Text style={styles.tenant}>
                  <Ionicons name="person" size={14} color="#6B7280" />{' '}
                  {bill.contract?.tenant?.first_name} {bill.contract?.tenant?.last_name} — ล็อค{' '}
                  {bill.contract?.slot?.slot_number}
                </Text>
                <Text style={styles.amount}>
                  ฿{Number(bill.total_amount || 0).toLocaleString()}
                </Text>

                {/* Payment Slip Viewer Button */}
                {bill.payments && bill.payments.length > 0 ? (
                  bill.payments.map((p: any) => (
                    <TouchableOpacity
                      key={p.payment_id}
                      style={[
                        styles.verifyBtn,
                        p.verified_at
                          ? { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#D1D5DB' }
                          : {},
                      ]}
                      onPress={() => openSlipViewer(bill, p)}
                    >
                      <AntDesign
                        name={p.verified_at ? 'picture' : 'search'}
                        size={18}
                        color={p.verified_at ? '#4B5563' : '#1D4ED8'}
                      />
                      <Text
                        style={[
                          styles.verifyText,
                          p.verified_at ? { color: '#4B5563' } : {},
                        ]}
                      >
                        {p.verified_at ? 'ดูสลิป (ตรวจสอบแล้ว)' : 'ตรวจสอบสลิปโอนเงิน'}
                      </Text>
                    </TouchableOpacity>
                  ))
                ) : bill.status === 'PENDING' ? (
                  <View
                    style={[
                      styles.verifyBtn,
                      { backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A' },
                    ]}
                  >
                    <Ionicons name="time-outline" size={18} color="#92400E" />
                    <Text style={[styles.verifyText, { color: '#92400E' }]}>
                      รอผู้เช่าส่งหลักฐานการชำระเงิน
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ─── Slip Viewer Modal ─── */}
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
                  <Text style={styles.billSummaryText}>
                    บิลประจำเดือน{' '}
                    {new Date(selectedBill.billing_month).toLocaleDateString('th-TH', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                  <Text style={styles.billSummaryText}>
                    ล็อค {selectedBill.contract?.slot?.slot_number} -{' '}
                    {selectedBill.contract?.tenant?.first_name}
                  </Text>
                  <Text style={styles.billSummaryValue}>
                    ยอดชำระ: ฿{Number(selectedBill.total_amount).toLocaleString()}
                  </Text>
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

            {/* Action buttons if not yet verified */}
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

      {/* ─── Grid Month Picker Modal ─── */}
      <Modal
        visible={monthPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMonthPickerVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setMonthPickerVisible(false)}>
          <View style={styles.pickerOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.pickerCard}>
                
                {/* Year Selector */}
                <View style={styles.yearHeader}>
                  <TouchableOpacity onPress={() => setPickerYear((prev) => prev - 1)} style={styles.yearBtn}>
                    <Ionicons name="chevron-back" size={24} color="#4B5563" />
                  </TouchableOpacity>
                  <Text style={styles.yearText}>ปี {pickerYear + 543}</Text>
                  <TouchableOpacity onPress={() => setPickerYear((prev) => prev + 1)} style={styles.yearBtn}>
                    <Ionicons name="chevron-forward" size={24} color="#4B5563" />
                  </TouchableOpacity>
                </View>

                {/* Months Grid */}
                <View style={styles.monthsGrid}>
                  {THAI_MONTHS.map((monthName, index) => {
                    const ym = `${pickerYear}-${String(index + 1).padStart(2, '0')}`;
                    const isSelected = selectedMonth === ym;
                    const hasData = availableMonths.includes(ym);

                    return (
                      <TouchableOpacity
                        key={monthName}
                        style={[
                          styles.monthItem,
                          isSelected && styles.monthItemActive,
                          !hasData && !isSelected && styles.monthItemEmpty
                        ]}
                        onPress={() => handleSelectMonth(index)}
                      >
                        <Text
                          style={[
                            styles.monthItemText,
                            isSelected && styles.monthItemTextActive,
                            !hasData && !isSelected && styles.monthItemTextEmpty
                          ]}
                        >
                          {monthName}
                        </Text>
                        {hasData && !isSelected && (
                          <View style={styles.hasDataDot} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Bottom Actions */}
                <View style={styles.pickerActions}>
                  <TouchableOpacity
                    style={styles.selectAllBtn}
                    onPress={handleSelectAllMonths}
                  >
                    <Text style={styles.selectAllBtnText}>ดูบิลทุกเดือน</Text>
                  </TouchableOpacity>
                </View>

              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // ─── Top Bar ───
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 10,
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    marginRight: 8,
    backgroundColor: '#fff',
  },
  filterActive: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  filterText: {
    fontSize: 12,
    color: '#6B7280',
  },
  filterActiveText: {
    color: '#DC2626',
    fontWeight: '700',
  },
  monthDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 12,
    gap: 6,
  },
  monthDropdownText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7C3AED',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    color: '#9CA3AF',
    marginTop: 12,
    fontSize: 16,
  },

  // ─── Card ───
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  month: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  tenant: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  amount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#7C3AED',
    marginBottom: 8,
  },
  verifyBtn: {
    backgroundColor: '#DBEAFE',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  verifyText: {
    color: '#1D4ED8',
    fontWeight: '700',
    fontSize: 13,
  },

  // ─── Modals ───
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: Dimensions.get('window').height * 0.8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    fontSize: 20,
    color: '#6B7280',
  },
  modalContent: {
    padding: 16,
  },
  billSummary: {
    backgroundColor: '#F9FAFB',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  billSummaryText: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 4,
  },
  billSummaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DC2626',
    marginTop: 4,
  },
  slipImage: {
    width: '100%',
    height: 400,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  noSlip: {
    width: '100%',
    height: 300,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noSlipText: {
    color: '#9CA3AF',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  actionBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionReject: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  actionRejectText: {
    color: '#DC2626',
  },
  actionApprove: {
    backgroundColor: '#16A34A',
  },
  actionApproveText: {
    color: '#fff',
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },

  // ─── Grid Month Picker ───
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 340,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  yearHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  yearBtn: {
    padding: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  yearText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  monthItem: {
    width: '30%',
    aspectRatio: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  monthItemActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  monthItemEmpty: {
    backgroundColor: '#F9FAFB',
    borderColor: '#F3F4F6',
  },
  monthItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  monthItemTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  monthItemTextEmpty: {
    color: '#9CA3AF',
  },
  hasDataDot: {
    position: 'absolute',
    top: 6,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  pickerActions: {
    marginTop: 10,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  selectAllBtn: {
    width: '100%',
    paddingVertical: 12,
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    alignItems: 'center',
  },
  selectAllBtnText: {
    color: '#7C3AED',
    fontWeight: '700',
    fontSize: 15,
  },
});
