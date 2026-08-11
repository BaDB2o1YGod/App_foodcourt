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
import { maintenanceAPI } from '../../services/api';

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

const CATEGORY_COLORS: { [key: string]: string } = {
  'ระบบไฟฟ้า': '#F59E0B',
  'ระบบประปา': '#3B82F6',
  'โครงสร้าง': '#8B5CF6',
  'อุปกรณ์': '#10B981',
  'อื่นๆ': '#6B7280',
};

export default function ExecutiveRepairs() {
  const [repairs, setRepairs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');

  // Year & Month selection for Donut Chart
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [showYearModal, setShowYearModal] = useState(false);
  const [showMonthModal, setShowMonthModal] = useState(false);

  const fetchData = async () => {
    try {
      const res = await maintenanceAPI.getAll();
      setRepairs(res.data.data || []);
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

  // Available years from repairs data
  const availableYears = Array.from(
    new Set(
      repairs
        .map((r) => {
          const dateStr = r.requested_at || r.created_at;
          if (!dateStr) return null;
          const d = new Date(dateStr);
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
      repairs
        .filter((r) => {
          const dateStr = r.requested_at || r.created_at;
          if (!dateStr) return false;
          const d = new Date(dateStr);
          return !isNaN(d.getTime()) && String(d.getFullYear()) === activeYear;
        })
        .map((r) => String(new Date(r.requested_at || r.created_at).getMonth() + 1).padStart(2, '0'))
    )
  ).sort();

  const currentMonthStr = String(new Date().getMonth() + 1).padStart(2, '0');
  const activeMonth = selectedMonth && THAI_MONTHS.some((m) => m.value === selectedMonth)
    ? selectedMonth
    : (monthsForActiveYear[monthsForActiveYear.length - 1] || currentMonthStr);

  const activeMonthKey = `${activeYear}-${activeMonth}`;

  // Donut chart data filtered by selected year & month
  const donutRepairs = repairs.filter((r) => getMonthKey(r.requested_at || r.created_at) === activeMonthKey);
  const donutPending = donutRepairs.filter((r) => r.status === 'PENDING');
  const donutInProgress = donutRepairs.filter((r) => r.status === 'IN_PROGRESS');
  const donutCompleted = donutRepairs.filter((r) => r.status === 'COMPLETED');

  // Overall KPIs
  const pendingCount = repairs.filter((r) => r.status === 'PENDING').length;
  const inProgressCount = repairs.filter((r) => r.status === 'IN_PROGRESS').length;
  const completedCount = repairs.filter((r) => r.status === 'COMPLETED').length;

  const filteredRepairs = selectedFilter === 'ALL'
    ? repairs
    : repairs.filter((r) => r.status === selectedFilter);

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
      {/* KPI Summary Row */}
      <View style={styles.summaryRow}>
        <View style={[styles.sumCard, { borderTopColor: '#F59E0B' }]}>
          <Text style={[styles.sumCount, { color: '#F59E0B' }]}>{pendingCount}</Text>
          <Text style={styles.sumLabel}>รอดำเนินการ</Text>
        </View>
        <View style={[styles.sumCard, { borderTopColor: '#3B82F6' }]}>
          <Text style={[styles.sumCount, { color: '#3B82F6' }]}>{inProgressCount}</Text>
          <Text style={styles.sumLabel}>กำลังดำเนินการ</Text>
        </View>
        <View style={[styles.sumCard, { borderTopColor: '#10B981' }]}>
          <Text style={[styles.sumCount, { color: '#10B981' }]}>{completedCount}</Text>
          <Text style={styles.sumLabel}>เสร็จสิ้น</Text>
        </View>
      </View>

      {/* Chart Section 1: Donut Chart - Repair Status Breakdown */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>สัดส่วนสถานะงานซ่อมประจำเดือน</Text>

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

        <RepairDonutChart
          pending={donutPending.length}
          inProgress={donutInProgress.length}
          completed={donutCompleted.length}
        />
      </View>

      {/* Chart Section 2: Horizontal Bar Chart - Category Breakdown */}
      <View style={styles.chartCard}>
        <CategoryHorizontalBarChart repairs={repairs} />
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
                        {m.label} {!hasData ? '(ไม่มีรายการ)' : ''}
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

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED'] as const).map((filterKey) => (
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
                ? `ทั้งหมด (${repairs.length})`
                : filterKey === 'PENDING'
                ? `รอดำเนินการ (${pendingCount})`
                : filterKey === 'IN_PROGRESS'
                ? `กำลังทำ (${inProgressCount})`
                : `เสร็จสิ้น (${completedCount})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Repair List */}
      <Text style={styles.listSectionTitle}>📋 รายการแจ้งซ่อม ({filteredRepairs.length})</Text>
      {filteredRepairs.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>ไม่พบรายการแจ้งซ่อมตามเงื่อนไขที่เลือก</Text>
        </View>
      ) : (
        filteredRepairs.map((req) => (
          <View key={req.request_id} style={styles.card}>
            <View style={styles.cardRow}>
              <Text style={styles.title} numberOfLines={1}>{req.title}</Text>
              <StatusBadge status={req.status} size="sm" />
            </View>
            {req.category && <Text style={styles.meta}>🏷 {req.category}</Text>}
            <Text style={styles.meta}>
              📅 {req.requested_at || req.created_at ? new Date(req.requested_at || req.created_at).toLocaleDateString('th-TH') : '-'}
            </Text>
            <Text style={styles.meta}>
              👤 {req.tenant?.first_name || 'ผู้เช่า'} — ล็อก {req.slot?.slot_number || '-'}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

{/* Donut Chart Component for Repairs */}
function RepairDonutChart({
  pending,
  inProgress,
  completed,
}: {
  pending: number;
  inProgress: number;
  completed: number;
}) {
  const total = pending + inProgress + completed;
  if (total === 0) {
    return (
      <View style={styles.emptyChart}>
        <Text style={styles.emptyText}>ไม่มีข้อมูลการแจ้งซ่อมในเดือนนี้</Text>
      </View>
    );
  }

  const radius = 40;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;

  const completedRatio = completed / total;
  const inProgressRatio = inProgress / total;
  const pendingRatio = pending / total;

  const completedDash = completedRatio * circumference;
  const inProgressDash = inProgressRatio * circumference;
  const pendingDash = pendingRatio * circumference;

  const completedOffset = 0;
  const inProgressOffset = -completedDash;
  const pendingOffset = -(completedDash + inProgressDash);

  const resolutionRate = Math.round(completedRatio * 100);

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
            {completed > 0 && (
              <Circle
                cx="60"
                cy="60"
                r={radius}
                stroke="#10B981"
                strokeWidth={strokeWidth}
                strokeDasharray={`${completedDash} ${circumference}`}
                strokeDashoffset={completedOffset}
                strokeLinecap="round"
                fill="transparent"
              />
            )}
            {inProgress > 0 && (
              <Circle
                cx="60"
                cy="60"
                r={radius}
                stroke="#3B82F6"
                strokeWidth={strokeWidth}
                strokeDasharray={`${inProgressDash} ${circumference}`}
                strokeDashoffset={inProgressOffset}
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
          </G>
        </Svg>
        <View style={styles.centerTextContainer}>
          <Text style={styles.centerPercent}>{resolutionRate}%</Text>
          <Text style={styles.centerLabel}>แก้ไขสำเร็จ</Text>
        </View>
      </View>

      <View style={styles.legendContainer}>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
          <Text style={styles.legendText}>เสร็จสิ้น ({completed})</Text>
          <Text style={styles.legendValue}>{Math.round(completedRatio * 100)}%</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
          <Text style={styles.legendText}>กำลังดำเนิน ({inProgress})</Text>
          <Text style={styles.legendValue}>{Math.round(inProgressRatio * 100)}%</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
          <Text style={styles.legendText}>รอดำเนินการ ({pending})</Text>
          <Text style={styles.legendValue}>{Math.round(pendingRatio * 100)}%</Text>
        </View>
      </View>
    </View>
  );
}

{/* Horizontal Bar Chart for Repair Categories */}
function CategoryHorizontalBarChart({ repairs }: { repairs: any[] }) {
  const categoryCounts: { [key: string]: number } = {};

  repairs.forEach((r) => {
    const cat = r.category || 'อื่นๆ';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  const categoryEntries = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);

  if (categoryEntries.length === 0) {
    return (
      <View style={styles.emptyChart}>
        <Text style={styles.chartTitle}>📊 ประเภทงานซ่อมที่เกิดปัญหาบ่อยที่สุด</Text>
        <Text style={styles.emptyText}>ไม่มีข้อมูลหมวดหมู่งานซ่อม</Text>
      </View>
    );
  }

  const maxCount = Math.max(...categoryEntries.map((entry) => entry[1]), 1);

  return (
    <View style={styles.categoryChartContainer}>
      <Text style={styles.chartTitle}>📊 ประเภทงานซ่อมที่เกิดปัญหาบ่อยที่สุด</Text>
      <View style={styles.categoryList}>
        {categoryEntries.map(([catName, count]) => {
          const barWidthPercent = Math.max(10, Math.round((count / maxCount) * 100));
          const color = CATEGORY_COLORS[catName] || '#7C3AED';

          return (
            <View key={catName} style={styles.categoryRow}>
              <View style={styles.categoryLabelRow}>
                <Text style={styles.categoryNameText}>{catName}</Text>
                <Text style={styles.categoryCountText}>{count} ครั้ง</Text>
              </View>
              <View style={styles.categoryBarTrack}>
                <View
                  style={[
                    styles.categoryBarFill,
                    { width: `${barWidthPercent}%`, backgroundColor: color },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6', padding: 12 },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  sumCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderTopWidth: 3,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  sumCount: { fontSize: 18, fontWeight: '800' },
  sumLabel: { fontSize: 10, color: '#6B7280', marginTop: 2, textAlign: 'center' },

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
  centerPercent: { fontSize: 18, fontWeight: '800', color: '#10B981' },
  centerLabel: { fontSize: 10, color: '#6B7280', marginTop: -2 },

  legendContainer: { flex: 1, marginLeft: 16, gap: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendText: { fontSize: 12, color: '#374151', flex: 1 },
  legendValue: { fontSize: 12, fontWeight: '700', color: '#1F2937' },

  // Horizontal category bar chart styles
  categoryChartContainer: { flex: 1 },
  categoryList: { marginTop: 12, gap: 10 },
  categoryRow: { marginBottom: 4 },
  categoryLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  categoryNameText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  categoryCountText: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
  categoryBarTrack: {
    height: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 5,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    borderRadius: 5,
  },

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

  // List section
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
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  title: { fontSize: 13, fontWeight: '700', color: '#1F2937', flex: 1, marginRight: 8 },
  meta: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 8,
  },
});
