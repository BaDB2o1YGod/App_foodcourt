import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  Image, TouchableOpacity, Modal, Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { billsAPI } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const { width } = Dimensions.get('window');

/* ─── helpers ─────────────────────────────────────────── */
const THAI_MONTHS = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

const thMonthFull = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });

const thDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });

const baht = (n: number) =>
  `฿${Number(n ?? 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;

/* ─── types ───────────────────────────────────────────── */
interface Payment {
  payment_id: number;
  payment_date: string;
  payment_amount: number;
  payment_slip_url: string | null;
  verified_at: string | null;
  notes: string | null;
}
interface Expense {
  expense_id: number;
  billing_month: string;
  rent_amount: number;
  water_cost: number;
  electricity_cost: number;
  grease_trap_fee: number | null;
  total_amount: number;
  due_date: string;
  status: string;
  water_units: number | null;
  electricity_units: number | null;
  contract: { slot: { slot_number: string } };
  payments: Payment[];
}

/* ─── small components ────────────────────────────────── */
const Row = ({ label, value, bold }: { label: string; value: string; bold?: boolean }) => (
  <View style={s.row}>
    <Text style={s.rowLabel}>{label}</Text>
    <Text style={[s.rowValue, bold && s.rowValueBold]}>{value}</Text>
  </View>
);

/* ═══════════════════════════════════════════════════════ */
export default function PaymentHistory() {
  const [history, setHistory]       = useState<Expense[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [slipUri, setSlipUri]       = useState<string | null>(null);

  // Month Picker States
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
  const [pickerYear, setPickerYear] = useState<number>(new Date().getFullYear());

  const mainScrollRef = useRef<ScrollView>(null);

  /* fetch */
  const fetchData = async () => {
    try {
      const res = await billsAPI.getHistory();
      const data: Expense[] = res.data.data || [];
      setHistory(data);
    } catch (e) { console.error(e); }
  };
  useEffect(() => { fetchData().finally(() => setLoading(false)); }, []);

  // Available months from history
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    history.forEach((b) => {
      if (b.billing_month) {
        const d = new Date(b.billing_month);
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        months.add(ym);
      }
    });
    return Array.from(months);
  }, [history]);

  // Filtered history
  const filtered = useMemo(() => {
    if (selectedMonth === 'ALL') return history;
    return history.filter((i) => {
      if (!i.billing_month) return false;
      const d = new Date(i.billing_month);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return ym === selectedMonth;
    });
  }, [history, selectedMonth]);

  /* handlers */
  const openMonthPicker = () => {
    if (selectedMonth !== 'ALL') {
      const [y] = selectedMonth.split('-');
      setPickerYear(Number(y));
    } else if (history.length > 0 && history[0].billing_month) {
      setPickerYear(new Date(history[0].billing_month).getFullYear());
    } else {
      setPickerYear(new Date().getFullYear());
    }
    setMonthPickerVisible(true);
  };

  const handleSelectMonth = (monthIndex: number) => {
    const ym = `${pickerYear}-${String(monthIndex + 1).padStart(2, '0')}`;
    setSelectedMonth(ym);
    setMonthPickerVisible(false);
    mainScrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleSelectAllMonths = () => {
    setSelectedMonth('ALL');
    setMonthPickerVisible(false);
    mainScrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const formatMonthLabel = (ym: string) => {
    if (ym === 'ALL') return 'ทุกเดือน';
    const [year, month] = ym.split('-');
    const d = new Date(Number(year), Number(month) - 1, 1);
    return d.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' });
  };

  if (loading) return <LoadingSpinner />;

  /* summary text */
  const summaryText = selectedMonth === 'ALL'
    ? `ทุกเดือน · ${filtered.length} รายการ`
    : `${thMonthFull(history.find(i => {
        const d = new Date(i.billing_month);
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return ym === selectedMonth;
      })?.billing_month || `${selectedMonth}-01`)} · ${filtered.length} รายการ`;

  return (
    <>
      <View style={s.screen}>

        {/* ══ Filter bar ══════════════════════════════════ */}
        <View style={s.filterBar}>
          <TouchableOpacity
            style={s.monthDropdownBtn}
            onPress={openMonthPicker}
          >
            <Ionicons name="calendar-outline" size={16} color="#7C3AED" />
            <Text style={s.monthDropdownText}>{formatMonthLabel(selectedMonth)}</Text>
            <Ionicons name="chevron-down" size={14} color="#7C3AED" />
          </TouchableOpacity>
        </View>

        {/* ══ Main list ══════════════════════════════════ */}
        <ScrollView
          ref={mainScrollRef}
          style={s.container}
          contentContainerStyle={s.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={async () => {
              setRefreshing(true);
              await fetchData();
              setRefreshing(false);
            }} colors={['#7C3AED']} />
          }
        >
          <View style={s.header}>
            <Text style={s.headerTitle}>ประวัติการชำระเงิน</Text>
            <Text style={s.headerSub}>{summaryText}</Text>
          </View>

          {filtered.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyIcon}></Text>
              <Text style={s.emptyTitle}>ไม่มีข้อมูล</Text>
              <Text style={s.emptySub}>ยังไม่มีบิลที่ชำระในช่วงเวลาที่เลือก</Text>
            </View>
          ) : (
            filtered.map((item) => {
              const pay = item.payments?.[0];
              return (
                <View key={item.expense_id} style={s.card}>
                  {/* top */}
                  <View style={s.cardTop}>
                    <View style={s.monthBadge}>
                      <Text style={s.monthIcon}></Text>
                      <Text style={s.monthText}>{thMonthFull(item.billing_month)}</Text>
                    </View>
                    <View style={s.paidBadge}>
                      <Text style={s.paidText}>✅ ชำระแล้ว</Text>
                    </View>
                  </View>

                  <Text style={s.stallText}>ล็อค: {item.contract?.slot?.slot_number ?? '-'}</Text>

                  <View style={s.divider} />

                  {/* breakdown */}
                  <Text style={s.sectionLabel}>รายละเอียดบิล</Text>
                  <Row label="ค่าเช่า" value={baht(item.rent_amount)} />
                  <Row label={`ค่าน้ำ${item.water_units != null ? ` (${item.water_units} หน่วย)` : ''}`} value={baht(item.water_cost)} />
                  <Row label={`ค่าไฟ${item.electricity_units != null ? ` (${item.electricity_units} หน่วย)` : ''}`} value={baht(item.electricity_cost)} />
                  {(item.grease_trap_fee ?? 0) > 0 && <Row label="ค่าดักไขมัน" value={baht(item.grease_trap_fee!)} />}

                  <View style={s.totalRow}>
                    <Text style={s.totalLabel}>รวมทั้งหมด</Text>
                    <Text style={s.totalValue}>{baht(item.total_amount)}</Text>
                  </View>

                  {/* payment */}
                  {pay && (
                    <>
                      <View style={s.divider} />
                      <Text style={s.sectionLabel}>ข้อมูลการชำระ</Text>
                      <Row label="วันที่ชำระ" value={thDate(pay.payment_date)} />
                      <Row label="จำนวนที่ชำระ" value={baht(pay.payment_amount)} bold />
                      {pay.verified_at && <Row label="ยืนยันเมื่อ" value={thDate(pay.verified_at)} />}
                      {pay.notes && (
                        <View style={s.notesBox}>
                          <Text style={s.notesText}>📝 {pay.notes}</Text>
                        </View>
                      )}
                      {pay.payment_slip_url && (
                        <TouchableOpacity style={s.slipButton} onPress={() => setSlipUri(pay.payment_slip_url)}>
                          <Text style={s.slipButtonText}>หลักฐานการชำระเงิน</Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}

                  <View style={s.dueDateRow}>
                    <Text style={s.dueDateText}>กำหนดชำระ: {thDate(item.due_date)}</Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </View>

      {/* Slip Modal */}
      <Modal visible={!!slipUri} transparent animationType="fade" onRequestClose={() => setSlipUri(null)}>
        <TouchableOpacity style={s.modalBg} activeOpacity={1} onPress={() => setSlipUri(null)}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>สลิปการโอนเงิน</Text>
            {slipUri && <Image source={{ uri: slipUri }} style={s.slipImage} resizeMode="contain" />}
            <TouchableOpacity style={s.closeButton} onPress={() => setSlipUri(null)}>
              <Text style={s.closeButtonText}>ปิด</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ─── Grid Month Picker Modal ─── */}
      <Modal
        visible={monthPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMonthPickerVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setMonthPickerVisible(false)}>
          <View style={s.pickerOverlay}>
            <TouchableWithoutFeedback>
              <View style={s.pickerCard}>
                
                {/* Year Selector */}
                <View style={s.yearHeader}>
                  <TouchableOpacity onPress={() => setPickerYear((prev) => prev - 1)} style={s.yearBtn}>
                    <Ionicons name="chevron-back" size={24} color="#4B5563" />
                  </TouchableOpacity>
                  <Text style={s.yearText}>ปี {pickerYear + 543}</Text>
                  <TouchableOpacity onPress={() => setPickerYear((prev) => prev + 1)} style={s.yearBtn}>
                    <Ionicons name="chevron-forward" size={24} color="#4B5563" />
                  </TouchableOpacity>
                </View>

                {/* Months Grid */}
                <View style={s.monthsGrid}>
                  {THAI_MONTHS.map((monthName, index) => {
                    const ym = `${pickerYear}-${String(index + 1).padStart(2, '0')}`;
                    const isSelected = selectedMonth === ym;
                    const hasData = availableMonths.includes(ym);

                    return (
                      <TouchableOpacity
                        key={monthName}
                        style={[
                          s.monthItem,
                          isSelected && s.monthItemActive,
                          !hasData && !isSelected && s.monthItemEmpty
                        ]}
                        onPress={() => handleSelectMonth(index)}
                      >
                        <Text
                          style={[
                            s.monthItemText,
                            isSelected && s.monthItemTextActive,
                            !hasData && !isSelected && s.monthItemTextEmpty
                          ]}
                        >
                          {monthName}
                        </Text>
                        {hasData && !isSelected && (
                          <View style={s.hasDataDot} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Bottom Actions */}
                <View style={s.pickerActions}>
                  <TouchableOpacity
                    style={s.selectAllBtn}
                    onPress={handleSelectAllMonths}
                  >
                    <Text style={s.selectAllBtnText}>ดูประวัติทุกเดือน</Text>
                  </TouchableOpacity>
                </View>

              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

/* ─── styles ──────────────────────────────────────────── */
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F3F4F6' },

  /* filter bar */
  filterBar: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  monthDropdownText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#7C3AED',
  },

  /* main */
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  header: { marginBottom: 14 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1F2937' },
  headerSub: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },

  /* card */
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14,
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  monthBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  monthIcon: { fontSize: 16 },
  monthText: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  paidBadge: { backgroundColor: '#DCFCE7', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  paidText: { color: '#15803D', fontSize: 12, fontWeight: '600' },

  stallText: { fontSize: 13, color: '#6B7280', marginBottom: 10 },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 10 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 },

  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  rowLabel: { fontSize: 14, color: '#6B7280', flex: 1 },
  rowValue: { fontSize: 14, color: '#374151' },
  rowValueBold: { fontWeight: '700', color: '#1F2937' },

  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#F5F3FF', borderRadius: 10, padding: 10, marginTop: 4,
  },
  totalLabel: { fontSize: 14, fontWeight: '700', color: '#5B21B6' },
  totalValue: { fontSize: 18, fontWeight: '800', color: '#7C3AED' },

  notesBox: { backgroundColor: '#FFF7ED', borderRadius: 8, padding: 8, marginTop: 6 },
  notesText: { color: '#92400E', fontSize: 13 },

  slipButton: { marginTop: 10, backgroundColor: '#EDE9FE', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  slipButtonText: { color: '#7C3AED', fontWeight: '600', fontSize: 14 },

  dueDateRow: { marginTop: 10 },
  dueDateText: { fontSize: 12, color: '#9CA3AF', textAlign: 'right' },

  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 52, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 6 },
  emptySub: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 24 },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#fff', borderRadius: 20, padding: 20, width: width - 48, alignItems: 'center' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 16 },
  slipImage: { width: width - 96, height: width - 96, borderRadius: 12 },
  closeButton: { marginTop: 16, backgroundColor: '#7C3AED', borderRadius: 10, paddingHorizontal: 32, paddingVertical: 10 },
  closeButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  /* Grid Month Picker Modal */
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
