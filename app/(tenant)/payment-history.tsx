import { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  Image, TouchableOpacity, Modal, Dimensions, FlatList,
} from 'react-native';
import { billsAPI } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const { width } = Dimensions.get('window');

/* ─── helpers ─────────────────────────────────────────── */
const getYear  = (d: string) => new Date(d).getFullYear();
const getMonth = (d: string) => new Date(d).getMonth() + 1; // 1-12

const thMonthShort = (month: number) =>
  new Date(2000, month - 1, 1).toLocaleDateString('th-TH', { month: 'short' });

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
  const [selYear, setSelYear]       = useState<number | null>(null);
  const [selMonth, setSelMonth]     = useState<number | null>(null); // null = all months

  const yearListRef  = useRef<FlatList>(null);
  const monthListRef = useRef<FlatList>(null);
  const mainScrollRef = useRef<ScrollView>(null);

  /* fetch */
  const fetchData = async () => {
    try {
      const res = await billsAPI.getHistory();
      const data: Expense[] = res.data.data || [];
      setHistory(data);
      if (data.length > 0 && !selYear) {
        setSelYear(getYear(data[0].billing_month));
        setSelMonth(null);
      }
    } catch (e) { console.error(e); }
  };
  useEffect(() => { fetchData().finally(() => setLoading(false)); }, []);

  /* derived lists */
  const years: number[] = Array.from(new Set(history.map(i => getYear(i.billing_month)))).sort().reverse();

  const monthsInYear: number[] = selYear
    ? Array.from(new Set(history.filter(i => getYear(i.billing_month) === selYear).map(i => getMonth(i.billing_month))))
        .sort().reverse()
    : [];

  const filtered = history.filter(i => {
    if (selYear  && getYear(i.billing_month)  !== selYear)  return false;
    if (selMonth && getMonth(i.billing_month) !== selMonth) return false;
    return true;
  });

  /* handlers */
  const handlePickYear = (y: number, idx: number) => {
    setSelYear(y);
    setSelMonth(null);
    mainScrollRef.current?.scrollTo({ y: 0, animated: true });
    yearListRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 });
  };
  const handlePickMonth = (m: number, idx: number) => {
    setSelMonth(prev => (prev === m ? null : m)); // toggle off
    mainScrollRef.current?.scrollTo({ y: 0, animated: true });
    if (selMonth !== m) monthListRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 });
  };

  if (loading) return <LoadingSpinner />;

  /* summary text */
  const summaryText = selMonth && selYear
    ? thMonthFull(history.find(i => getYear(i.billing_month) === selYear && getMonth(i.billing_month) === selMonth)?.billing_month ?? '')
    : selYear ? `ปี ${selYear + 543} · ${filtered.length} รายการ` : `${filtered.length} รายการ`;

  return (
    <>
      <View style={s.screen}>

        {/* ══ Filter bar ══════════════════════════════════ */}
        <View style={s.filterBar}>

          {/* — Year row — */}
          <Text style={s.filterLabel}>ปี</Text>
          <FlatList
            ref={yearListRef}
            data={years}
            horizontal
            keyExtractor={y => String(y)}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.pillRow}
            onScrollToIndexFailed={() => {}}
            renderItem={({ item: y, index }) => {
              const active = y === selYear;
              return (
                <TouchableOpacity
                  style={[s.pill, active && s.pillActiveYear]}
                  onPress={() => handlePickYear(y, index)}
                >
                  <Text style={[s.pillText, active && s.pillTextActiveYear]}>
                    {y + 543}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />

          {/* — Month row (only when a year is chosen) — */}
          {monthsInYear.length > 0 && (
            <>
              <Text style={[s.filterLabel, { marginTop: 8 }]}>เดือน</Text>
              <FlatList
                ref={monthListRef}
                data={monthsInYear}
                horizontal
                keyExtractor={m => String(m)}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.pillRow}
                onScrollToIndexFailed={() => {}}
                renderItem={({ item: m, index }) => {
                  const active = m === selMonth;
                  return (
                    <TouchableOpacity
                      style={[s.pill, active && s.pillActiveMonth]}
                      onPress={() => handlePickMonth(m, index)}
                    >
                      <Text style={[s.pillText, active && s.pillTextActiveMonth]}>
                        {thMonthShort(m)}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
            </>
          )}
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
              <Text style={s.emptyIcon}>🧾</Text>
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
                          <Text style={s.slipButtonText}>🖼 ดูสลิปการโอนเงิน</Text>
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
    </>
  );
}

/* ─── styles ──────────────────────────────────────────── */
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F3F4F6' },

  /* filter bar */
  filterBar: {
    backgroundColor: '#fff',
    paddingTop: 12, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  filterLabel: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.5, paddingHorizontal: 16, marginBottom: 6, textTransform: 'uppercase' },
  pillRow: { paddingHorizontal: 16, gap: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1.5, borderColor: 'transparent' },

  pillActiveYear:  { backgroundColor: '#1E40AF22', borderColor: '#1D4ED8' },
  pillActiveMonth: { backgroundColor: '#EDE9FE',   borderColor: '#7C3AED' },

  pillText:            { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  pillTextActiveYear:  { color: '#1D4ED8', fontWeight: '700' },
  pillTextActiveMonth: { color: '#7C3AED', fontWeight: '700' },

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
});
