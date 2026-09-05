import { useEffect, useState } from 'react';
import {
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StatusBadge from '../../components/ui/StatusBadge';
import { billsAPI } from '../../services/api';

const THAI_MONTHS = [
  { value: '01', label: 'มกราคม' },
  { value: '02', label: 'กุมภาพันธ์' },
  { value: '03', label: 'มีนาคม' },
  { value: '04', label: 'เมษายน' },
  { value: '05', label: 'พฤษภาคม' },
  { value: '06', label: 'มิถุนายน' },
  { value: '07', label: 'กรกฎาคม' },
  { value: '08', label: 'สิงหาคม' },
  { value: '09', label: 'กันยายน' },
  { value: '10', label: 'ตุลาคม' },
  { value: '11', label: 'พฤศจิกายน' },
  { value: '12', label: 'ธันวาคม' },
];

export default function ExecutiveBills() {
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'PAID' | 'PENDING' | 'OVERDUE'>('ALL');
  
  // Year & Month selection for Donut Chart
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [showYearModal, setShowYearModal] = useState(false);
  const [showMonthModal, setShowMonthModal] = useState(false);

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

  const getMonthKey = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  // Available years from bills data
  const availableYears = Array.from(
    new Set(
      bills
        .map((b) => {
          if (!b.billing_month) return null;
          const d = new Date(b.billing_month);
          return isNaN(d.getTime()) ? null : String(d.getFullYear());
        })
        .filter((y): y is string => Boolean(y))
    )
  ).sort().reverse();

  const currentYearStr = String(new Date().getFullYear());
  const yearOptions = availableYears.length > 0 ? availableYears : [currentYearStr];

  const activeYear = selectedYear && yearOptions.includes(selectedYear)
    ? selectedYear
    : yearOptions[0];

  // Available months for activeYear
  const monthsForActiveYear = Array.from(
    new Set(
      bills
        .filter((b) => {
          if (!b.billing_month) return false;
          const d = new Date(b.billing_month);
          return !isNaN(d.getTime()) && String(d.getFullYear()) === activeYear;
        })
        .map((b) => String(new Date(b.billing_month).getMonth() + 1).padStart(2, '0'))
    )
  ).sort();

  const currentMonthStr = String(new Date().getMonth() + 1).padStart(2, '0');
  const activeMonth = selectedMonth && THAI_MONTHS.some((m) => m.value === selectedMonth)
    ? selectedMonth
    : (monthsForActiveYear[monthsForActiveYear.length - 1] || currentMonthStr);

  const activeMonthKey = `${activeYear}-${activeMonth}`;

  // Donut chart data filtered by selected year & month
  const donutBills = bills.filter((b) => getMonthKey(b.billing_month) === activeMonthKey);
  const donutPaid = donutBills.filter((b) => b.status === 'PAID');
  const donutPending = donutBills.filter((b) => b.status === 'PENDING');
  const donutOverdue = donutBills.filter((b) => b.status === 'OVERDUE');
  const donutTotalAmount = donutBills.reduce((sum, b) => sum + Number(b.total_amount || 0), 0);
  const donutPaidAmount = donutPaid.reduce((sum, b) => sum + Number(b.total_amount || 0), 0);

  // General KPIs
  const totalAmount = bills.reduce((sum, b) => sum + Number(b.total_amount || 0), 0);
  const paidBills = bills.filter((b) => b.status === 'PAID');
  const pendingBills = bills.filter((b) => b.status === 'PENDING');
  const overdueBills = bills.filter((b) => b.status === 'OVERDUE');

  const filteredBills = selectedFilter === 'ALL'
    ? bills
    : bills.filter((b) => b.status === selectedFilter);

  if (loading) return <LoadingSpinner />;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 24 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await fetchData();
            setRefreshing(false);
          }}
          colors={['#7C3AED']}
        />
      }
    >
      {/* KPI Summary Header */}
      <View style={styles.summaryRow}>
        <View style={styles.sumCard}>
          <Text style={styles.sumCount}>{bills.length}</Text>
          <Text style={styles.sumLabel}>บิลทั้งหมด</Text>
        </View>
        <View style={[styles.sumCard, { borderTopColor: '#F59E0B' }]}>
          <Text style={[styles.sumCount, { color: '#F59E0B' }]}>{pendingBills.length}</Text>
          <Text style={styles.sumLabel}>รอชำระ</Text>
        </View>
        <View style={[styles.sumCard, { borderTopColor: '#EF4444' }]}>
          <Text style={[styles.sumCount, { color: '#EF4444' }]}>{overdueBills.length}</Text>
          <Text style={styles.sumLabel}>เกินกำหนด</Text>
        </View>
        <View style={[styles.sumCard, { borderTopColor: '#7C3AED' }]}>
          <Text style={[styles.sumCount, { color: '#7C3AED' }]}>
            ฿{Math.round(totalAmount / 1000)}K
          </Text>
          <Text style={styles.sumLabel}>ยอดรวม</Text>
        </View>
      </View>

      {/* Chart Section 1: Donut Chart - Payment Status Breakdown by Month */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>สัดส่วนการชำระเงินประจำเดือน</Text>

        {/* Dropdown controls for Year and Month */}
        <View style={styles.dropdownRow}>
          <TouchableOpacity
            style={styles.dropdownBtn}
            onPress={() => setShowYearModal(true)}
          >
            <Ionicons name="calendar-outline" size={16} color="#7C3AED" />
            <Text style={styles.dropdownBtnText}>
              พ.ศ. {Number(activeYear) + 543}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#6B7280" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dropdownBtn}
            onPress={() => setShowMonthModal(true)}
          >
            <Ionicons name="time-outline" size={16} color="#7C3AED" />
            <Text style={styles.dropdownBtnText}>
              {THAI_MONTHS.find((m) => m.value === activeMonth)?.label || 'เลือกเดือน'}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <DonutChart
          paid={donutPaid.length}
          pending={donutPending.length}
          overdue={donutOverdue.length}
          totalAmount={donutTotalAmount}
          paidAmount={donutPaidAmount}
        />
      </View>

      {/* Modal for selecting Year */}
      <Modal visible={showYearModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowYearModal(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.dropdownModalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>เลือกปี</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowYearModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            {yearOptions.map((y) => (
              <TouchableOpacity
                key={y}
                style={[
                  styles.modalOptionRow,
                  activeYear === y && styles.modalOptionActive,
                ]}
                onPress={() => {
                  setSelectedYear(y);
                  setShowYearModal(false);
                }}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    activeYear === y && styles.modalOptionTextActive,
                  ]}
                >
                  พ.ศ. {Number(y) + 543} ({y})
                </Text>
                {activeYear === y && (
                  <Ionicons name="checkmark" size={18} color="#7C3AED" />
                )}
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Modal for selecting Month */}
      <Modal visible={showMonthModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMonthModal(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.dropdownModalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>เลือกเดือน</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowMonthModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 320 }}>
              {THAI_MONTHS.map((m) => {
                const hasData = monthsForActiveYear.includes(m.value);
                const isSelected = activeMonth === m.value;

                return (
                  <TouchableOpacity
                    key={m.value}
                    style={[
                      styles.modalOptionRow,
                      isSelected && styles.modalOptionActive,
                    ]}
                    onPress={() => {
                      setSelectedMonth(m.value);
                      setShowMonthModal(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        isSelected && styles.modalOptionTextActive,
                        !hasData && styles.modalOptionTextDisabled,
                      ]}
                    >
                      {m.label} {!hasData ? '(ไม่มีบิล)' : ''}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={18} color="#7C3AED" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Chart Section 2: Bar Chart - Monthly Revenue Trend */}
      <View style={styles.chartCard}>
        <RevenueBarChart bills={bills} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(['ALL', 'PAID', 'PENDING', 'OVERDUE'] as const).map((filterKey) => (
          <TouchableOpacity
            key={filterKey}
            onPress={() => setSelectedFilter(filterKey)}
            style={[
              styles.filterChip,
              selectedFilter === filterKey && styles.filterChipActive,
            ]}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === filterKey && styles.filterChipTextActive,
              ]}
            >
              {filterKey === 'ALL'
                ? `ทั้งหมด (${bills.length})`
                : filterKey === 'PAID'
                ? `ชำระแล้ว (${paidBills.length})`
                : filterKey === 'PENDING'
                ? `รอชำระ (${pendingBills.length})`
                : `เกินกำหนด (${overdueBills.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Bill List */}
      <Text style={styles.listSectionTitle}>📋 รายการบิล ({filteredBills.length})</Text>
      {filteredBills.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>ไม่พบรายการบิลตามเงื่อนไขที่เลือก</Text>
        </View>
      ) : (
        filteredBills.map((bill) => (
          <View key={bill.expense_id || bill.bill_id} style={styles.card}>
            <View style={styles.cardRow}>
              <Text style={styles.month}>
                {bill.billing_month
                  ? new Date(bill.billing_month).toLocaleDateString('th-TH', {
                      month: 'long',
                      year: 'numeric',
                    })
                  : 'ไม่ระบุเดือน'}
              </Text>
              <StatusBadge status={bill.status} size="sm" />
            </View>
            <Text style={styles.amount}>
              ฿{Number(bill.total_amount || 0).toLocaleString()}
            </Text>
            <Text style={styles.meta}>
              ล็อค {bill.contract?.slot?.slot_number || '-'} —{' '}
              {bill.contract?.tenant?.first_name || 'ผู้เช่า'}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

{/* Donut Chart Component */}
function DonutChart({
  paid,
  pending,
  overdue,
  totalAmount,
  paidAmount,
}: {
  paid: number;
  pending: number;
  overdue: number;
  totalAmount: number;
  paidAmount: number;
}) {
  const total = paid + pending + overdue;
  if (total === 0) {
    return (
      <View style={styles.emptyChart}>
        <Text style={styles.emptyText}>ไม่มีข้อมูลสำหรับแสดงกราฟ</Text>
      </View>
    );
  }

  const radius = 40;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;

  const paidRatio = paid / total;
  const pendingRatio = pending / total;
  const overdueRatio = overdue / total;

  const paidDash = paidRatio * circumference;
  const pendingDash = pendingRatio * circumference;
  const overdueDash = overdueRatio * circumference;

  const paidOffset = 0;
  const pendingOffset = -paidDash;
  const overdueOffset = -(paidDash + pendingDash);

  const collectionRate = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;

  return (
    <View style={styles.donutContainer}>
      <View style={styles.svgWrapper}>
        <Svg width={130} height={130} viewBox="0 0 120 120">
          <G rotation="-90" origin="60, 60">
            <Circle
              cx="60"
              cy="60"
              r={radius}
              stroke="#F3F4F6"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {paid > 0 && (
              <Circle
                cx="60"
                cy="60"
                r={radius}
                stroke="#10B981"
                strokeWidth={strokeWidth}
                strokeDasharray={`${paidDash} ${circumference}`}
                strokeDashoffset={paidOffset}
                strokeLinecap="round"
                fill="transparent"
              />
            )}
            {pending > 0 && (
              <Circle
                cx="60"
                cy="60"
                r={radius}
                stroke="#F59E0B"
                strokeWidth={strokeWidth}
                strokeDasharray={`${pendingDash} ${circumference}`}
                strokeDashoffset={pendingOffset}
                strokeLinecap="round"
                fill="transparent"
              />
            )}
            {overdue > 0 && (
              <Circle
                cx="60"
                cy="60"
                r={radius}
                stroke="#EF4444"
                strokeWidth={strokeWidth}
                strokeDasharray={`${overdueDash} ${circumference}`}
                strokeDashoffset={overdueOffset}
                strokeLinecap="round"
                fill="transparent"
              />
            )}
          </G>
        </Svg>
        <View style={styles.centerTextContainer}>
          <Text style={styles.centerPercent}>{collectionRate}%</Text>
          <Text style={styles.centerLabel}>จัดเก็บแล้ว</Text>
        </View>
      </View>

      <View style={styles.legendContainer}>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
          <Text style={styles.legendText}>ชำระแล้ว ({paid})</Text>
          <Text style={styles.legendValue}>{Math.round(paidRatio * 100)}%</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
          <Text style={styles.legendText}>รอชำระ ({pending})</Text>
          <Text style={styles.legendValue}>{Math.round(pendingRatio * 100)}%</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
          <Text style={styles.legendText}>เกินกำหนด ({overdue})</Text>
          <Text style={styles.legendValue}>{Math.round(overdueRatio * 100)}%</Text>
        </View>
      </View>
    </View>
  );
}

{/* Revenue Bar Chart Component */}
function RevenueBarChart({ bills }: { bills: any[] }) {
  const monthlyMap: { [key: string]: number } = {};

  bills.forEach((b) => {
    if (!b.billing_month) return;
    const date = new Date(b.billing_month);
    if (isNaN(date.getTime())) return;

    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const amount = Number(b.total_amount || 0);
    monthlyMap[key] = (monthlyMap[key] || 0) + amount;
  });

  const sortedKeys = Object.keys(monthlyMap).sort().slice(-6);
  if (sortedKeys.length === 0) {
    return (
      <View style={styles.emptyChart}>
        <Text style={styles.chartTitle}>📊 แนวโน้มรายได้รวมรายเดือน</Text>
        <Text style={styles.emptyText}>ไม่มีข้อมูลรายได้ย้อนหลัง</Text>
      </View>
    );
  }

  const maxAmount = Math.max(...sortedKeys.map((k) => monthlyMap[k]), 1);

  return (
    <View style={styles.barChartContainer}>
      <Text style={styles.chartTitle}>📊 แนวโน้มรายได้รวมรายเดือน (ย้อนหลัง 6 เดือน)</Text>
      <View style={styles.barRow}>
        {sortedKeys.map((key) => {
          const val = monthlyMap[key];
          const [year, month] = key.split('-');
          const dateObj = new Date(Number(year), Number(month) - 1, 1);
          const monthLabel = dateObj.toLocaleDateString('th-TH', { month: 'short' });
          const heightPercent = Math.max(12, Math.round((val / maxAmount) * 100));

          return (
            <View key={key} style={styles.barCol}>
              <Text style={styles.barValueText}>
                {val >= 1000 ? `฿${Math.round(val / 1000)}k` : `฿${val}`}
              </Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { height: `${heightPercent}%` },
                  ]}
                />
              </View>
              <Text style={styles.barLabel}>{monthLabel}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6', padding: 12 },
  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  sumCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderTopWidth: 3,
    borderTopColor: '#059669',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  sumCount: { fontSize: 16, fontWeight: '800', color: '#059669' },
  sumLabel: { fontSize: 10, color: '#6B7280', marginTop: 2 },

  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  chartTitle: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  dropdownRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    marginBottom: 16,
  },
  dropdownBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  dropdownBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dropdownModalContent: {
    width: '85%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalCloseBtn: {
    padding: 4,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  modalOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  modalOptionActive: {
    backgroundColor: '#F3E8FF',
  },
  modalOptionText: {
    fontSize: 14,
    color: '#374151',
  },
  modalOptionTextActive: {
    fontWeight: '700',
    color: '#7C3AED',
  },
  modalOptionTextDisabled: {
    color: '#9CA3AF',
  },

  // Donut chart styles
  donutContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  svgWrapper: { width: 130, height: 130, justifyContent: 'center', alignItems: 'center' },
  centerTextContainer: { position: 'absolute', justifyContent: 'center', alignItems: 'center' },
  centerPercent: { fontSize: 18, fontWeight: '800', color: '#7C3AED' },
  centerLabel: { fontSize: 10, color: '#6B7280', marginTop: -2 },

  legendContainer: { flex: 1, marginLeft: 16, gap: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendText: { fontSize: 12, color: '#374151', flex: 1 },
  legendValue: { fontSize: 12, fontWeight: '700', color: '#1F2937' },

  // Bar chart styles
  barChartContainer: { flex: 1 },
  barRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 140,
    paddingTop: 20,
    paddingHorizontal: 8,
  },
  barCol: { flex: 1, alignItems: 'center', height: '100%' },
  barValueText: { fontSize: 10, fontWeight: '700', color: '#7C3AED', marginBottom: 4 },
  barTrack: {
    flex: 1,
    width: 22,
    backgroundColor: '#F3F4F6',
    borderRadius: 11,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: '#7C3AED',
    borderTopLeftRadius: 11,
    borderTopRightRadius: 11,
    borderBottomLeftRadius: 11,
    borderBottomRightRadius: 11,
  },
  barLabel: { fontSize: 11, color: '#6B7280', marginTop: 6, fontWeight: '500' },

  emptyChart: { padding: 20, alignItems: 'center' },
  emptyText: { fontSize: 13, color: '#9CA3AF' },

  // Filter chips
  filterRow: { flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
  },
  filterChipActive: { backgroundColor: '#7C3AED' },
  filterChipText: { fontSize: 12, color: '#374151', fontWeight: '500' },
  filterChipTextActive: { color: '#ffffff', fontWeight: '700' },

  // Bill List
  listSectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  month: { fontSize: 13, fontWeight: '600', color: '#374151' },
  amount: { fontSize: 16, fontWeight: '800', color: '#7C3AED' },
  meta: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 8,
  },
});

