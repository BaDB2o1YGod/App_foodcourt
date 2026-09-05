import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { stallsAPI, billsAPI, maintenanceAPI, usersAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import {
  DonutSlice,
  DonutChart,
  LegendItem,
  CategoryBarItem,
  SlotRankItem,
} from '../../components/ui/Charts';

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface StallItem {
  id: number;
  slot_number: string;
  food_court_id: number;
  status: 'OCCUPIED' | 'VACANT' | 'MAINTENANCE' | string;
}

interface BillItem {
  id: number;
  total_amount?: number | string;
  totalAmount?: number | string;
  status: string;
  billing_month?: string;
  created_at?: string;
  tenant_name?: string;
  tenant?: { first_name?: string; last_name?: string };
  rental_slot?: { slot_number?: string; food_court_id?: number };
  slot?: { slot_number?: string; food_court_id?: number };
  contract?: {
    slot?: { slot_number?: string; food_court_id?: number };
    tenant?: { first_name?: string; last_name?: string };
  };
  rental_contract?: {
    rental_slot?: { slot_number?: string; food_court_id?: number };
  };
  food_court_id?: number;
}

interface RepairItem {
  id: number;
  title: string;
  category?: string;
  status: string;
  requested_at?: string;
  created_at?: string;
  slot_id?: number;
  slot?: {
    slot_number?: string;
    food_court_id?: number;
    food_court?: { name?: string };
  };
  rental_slot?: {
    slot_number?: string;
    food_court_id?: number;
  };
  food_court_id?: number;
}

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

// ─── Main Component ──────────────────────────────────────────────────────────
export default function ExecutiveDashboard() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFoodCourt, setSelectedFoodCourt] = useState<'ALL' | '1' | '2'>('ALL');
  const [watchlistTab, setWatchlistTab] = useState<'BILLS' | 'REPAIRS'>('BILLS');

  // Month Filtering States
  // Global Month: 'ALL' or 'YYYY-MM'
  const [globalMonth, setGlobalMonth] = useState<string>('ALL');
  // Specific Month for Finance Card: 'SYNC' | 'ALL' | 'YYYY-MM'
  const [financeMonth, setFinanceMonth] = useState<string>('SYNC');

  // Month Picker Modal States
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'GLOBAL' | 'FINANCE'>('GLOBAL');
  const [pickerYear, setPickerYear] = useState<number>(new Date().getFullYear());

  // Raw API Data
  const [rawStalls, setRawStalls] = useState<StallItem[]>([]);
  const [rawBills, setRawBills] = useState<BillItem[]>([]);
  const [rawRepairs, setRawRepairs] = useState<RepairItem[]>([]);
  const [totalTenantsCount, setTotalTenantsCount] = useState(0);

  const fetchData = useCallback(async () => {
    if (!useAuthStore.getState().isAuthenticated) return;
    try {
      const [stallsRes, billsRes, repairsRes, usersRes] = await Promise.all([
        stallsAPI.getAll().catch(() => null),
        billsAPI.getAll().catch(() => null),
        maintenanceAPI.getAll().catch(() => null),
        usersAPI.getAll({ role: 'TENANT' }).catch(() => null),
      ]);

      const stalls: StallItem[] = stallsRes?.data?.data || [];
      const bills: BillItem[] = billsRes?.data?.data || [];
      const repairs: RepairItem[] = repairsRes?.data?.data || [];
      const tenants = usersRes?.data?.data || [];

      setRawStalls(stalls);
      setRawBills(bills);
      setRawRepairs(repairs);
      setTotalTenantsCount(tenants.length);
    } catch (error) {
      console.error('Error fetching executive dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  // Helper to extract food court ID
  const getSlotFoodCourtId = (item: BillItem | RepairItem): number | null => {
    return (
      item.rental_slot?.food_court_id ??
      item.slot?.food_court_id ??
      (item as BillItem).contract?.slot?.food_court_id ??
      (item as BillItem).rental_contract?.rental_slot?.food_court_id ??
      item.food_court_id ??
      null
    );
  };

  // Helper to check if bill belongs to a specific YYYY-MM
  const isBillInMonth = (bill: BillItem, ym: string): boolean => {
    if (ym === 'ALL') return true;
    const dStr = bill.billing_month || bill.created_at;
    if (!dStr) return false;
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return false;
    const billYm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return billYm === ym;
  };

  // Available months from bills data
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    rawBills.forEach((b) => {
      const dStr = b.billing_month || b.created_at;
      if (dStr) {
        const d = new Date(dStr);
        if (!isNaN(d.getTime())) {
          set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        }
      }
    });
    return Array.from(set);
  }, [rawBills]);

  // 1. FC1 vs FC2 Breakdown
  const fc1Stalls = rawStalls.filter((s) => s.food_court_id === 1);
  const fc1Total = fc1Stalls.length;
  const fc1Occupied = fc1Stalls.filter((s) => (s.status || '').toUpperCase() === 'OCCUPIED').length;
  const fc1Vacant = fc1Stalls.filter((s) => (s.status || '').toUpperCase() === 'VACANT').length;
  const fc1Maint = fc1Stalls.filter((s) => (s.status || '').toUpperCase() === 'MAINTENANCE').length;
  const fc1Rate = fc1Total > 0 ? Math.round((fc1Occupied / fc1Total) * 100) : 0;

  const fc2Stalls = rawStalls.filter((s) => s.food_court_id === 2);
  const fc2Total = fc2Stalls.length;
  const fc2Occupied = fc2Stalls.filter((s) => (s.status || '').toUpperCase() === 'OCCUPIED').length;
  const fc2Vacant = fc2Stalls.filter((s) => (s.status || '').toUpperCase() === 'VACANT').length;
  const fc2Maint = fc2Stalls.filter((s) => (s.status || '').toUpperCase() === 'MAINTENANCE').length;
  const fc2Rate = fc2Total > 0 ? Math.round((fc2Occupied / fc2Total) * 100) : 0;

  // 2. Filtered Subsets based on selectedFoodCourt
  const currentStalls = rawStalls.filter((s) => {
    if (selectedFoodCourt === 'ALL') return true;
    return s.food_court_id === Number(selectedFoodCourt);
  });

  const currentBills = rawBills.filter((b) => {
    if (selectedFoodCourt === 'ALL') return true;
    return getSlotFoodCourtId(b) === Number(selectedFoodCourt);
  });

  const currentRepairs = rawRepairs.filter((r) => {
    if (selectedFoodCourt === 'ALL') return true;
    return getSlotFoodCourtId(r) === Number(selectedFoodCourt);
  });

  // 3. Occupancy Stats
  const occupiedStalls = currentStalls.filter((s) => (s.status || '').toUpperCase() === 'OCCUPIED').length;
  const vacantStalls = currentStalls.filter((s) => (s.status || '').toUpperCase() === 'VACANT').length;
  const maintenanceStalls = currentStalls.filter((s) => (s.status || '').toUpperCase() === 'MAINTENANCE').length;
  const occupancyRate = currentStalls.length > 0 ? Math.round((occupiedStalls / currentStalls.length) * 100) : 0;

  // 4. Global Bills & Financials (controlled by globalMonth)
  const globalBills = currentBills.filter((b) => isBillInMonth(b, globalMonth));

  let globalTotalRevenue = 0;
  let globalTotalBilled = 0;
  let globalPendingAmount = 0;

  globalBills.forEach((b) => {
    const amount = Number(b.total_amount || b.totalAmount || 0);
    globalTotalBilled += amount;
    const st = (b.status || '').toUpperCase();
    if (st === 'PAID') {
      globalTotalRevenue += amount;
    } else if (st === 'PENDING' || st === 'OVERDUE' || st === 'WAITING_VERIFICATION' || st === 'WAITING') {
      globalPendingAmount += amount;
    }
  });

  const globalCollectionRate = globalTotalBilled > 0 ? Math.round((globalTotalRevenue / globalTotalBilled) * 100) : 0;

  // 5. Specific Financial Health (controlled by financeMonth)
  const effectiveFinanceMonth = financeMonth === 'SYNC' ? globalMonth : financeMonth;
  const financeBills = currentBills.filter((b) => isBillInMonth(b, effectiveFinanceMonth));

  let financeTotalRevenue = 0;
  let financeTotalBilled = 0;
  let financePendingAmount = 0;

  financeBills.forEach((b) => {
    const amount = Number(b.total_amount || b.totalAmount || 0);
    financeTotalBilled += amount;
    const st = (b.status || '').toUpperCase();
    if (st === 'PAID') {
      financeTotalRevenue += amount;
    } else if (st === 'PENDING' || st === 'OVERDUE' || st === 'WAITING_VERIFICATION' || st === 'WAITING') {
      financePendingAmount += amount;
    }
  });

  const financeCollectionRate = financeTotalBilled > 0 ? Math.round((financeTotalRevenue / financeTotalBilled) * 100) : 0;

  // 6. Pending items & Watchlist (based on globalBills)
  const pendingBills = globalBills.filter((b) => {
    const st = (b.status || '').toUpperCase();
    return st === 'PENDING' || st === 'OVERDUE' || st === 'WAITING_VERIFICATION' || st === 'WAITING';
  });

  const pendingRepairs = currentRepairs.filter((r) => {
    const st = (r.status || '').toUpperCase();
    return st === 'PENDING' || st === 'IN_PROGRESS';
  });

  const pendingBillsWatchlist = pendingBills.slice(0, 4);
  const pendingRepairsWatchlist = pendingRepairs.slice(0, 4);

  // 7. Maintenance Insights
  const categoryMap: { [key: string]: number } = {};
  const slotMap: { [key: string]: number } = {};
  const totalRepairsCount = currentRepairs.length;

  currentRepairs.forEach((r) => {
    const cat = r.category || 'อื่นๆ';
    categoryMap[cat] = (categoryMap[cat] || 0) + 1;

    const fcName = r.slot?.food_court?.name ? `${r.slot.food_court.name} - ` : '';
    const slotNum = r.slot?.slot_number
      ? `${fcName}ล็อค ${r.slot.slot_number}`
      : r.slot_id
      ? `ล็อค #${r.slot_id}`
      : 'ไม่ระบุล็อค';
    slotMap[slotNum] = (slotMap[slotNum] || 0) + 1;
  });

  const categoryColorMap: { [key: string]: string } = {
    'ประปา': '#3B82F6',
    'ไฟฟ้า': '#F59E0B',
    'อุปกรณ์': '#8B5CF6',
    'โครงสร้าง': '#6B7280',
    'อื่นๆ': '#10B981',
  };

  const categoryList = Object.keys(categoryMap)
    .map((cat) => ({
      category: cat,
      count: categoryMap[cat],
      percent: totalRepairsCount > 0 ? Math.round((categoryMap[cat] / totalRepairsCount) * 100) : 0,
      color: categoryColorMap[cat] || '#80639A',
    }))
    .sort((a, b) => b.count - a.count);

  const slotList = Object.keys(slotMap)
    .map((slotNum) => ({
      slot_number: slotNum,
      count: slotMap[slotNum],
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const maxSlotCount = slotList.length > 0 ? Math.max(...slotList.map((s) => s.count)) : 1;

  // Donut slices for occupancy
  const occupancySlices: DonutSlice[] = [
    { color: '#059669', value: occupiedStalls },
    { color: '#D1FAE5', value: vacantStalls },
    { color: '#F59E0B', value: maintenanceStalls },
  ];

  const currentDateText = new Date().toLocaleDateString('th-TH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Helper to format month label for display
  const formatMonthDisplay = (ym: string, isFinance = false) => {
    if (isFinance && ym === 'SYNC') {
      return 'ตามภาพรวม';
    }
    if (ym === 'ALL') {
      return 'ทุกช่วงเวลา';
    }
    const [y, m] = ym.split('-');
    const mIdx = parseInt(m, 10) - 1;
    const thaiYear = parseInt(y, 10) + 543;
    return `${THAI_MONTHS_SHORT[mIdx]} ${thaiYear}`;
  };

  // Open Month Picker Modal
  const openPicker = (target: 'GLOBAL' | 'FINANCE') => {
    setPickerTarget(target);
    const activeVal = target === 'GLOBAL' ? globalMonth : (financeMonth === 'SYNC' ? globalMonth : financeMonth);
    if (activeVal !== 'ALL' && activeVal !== 'SYNC') {
      const [y] = activeVal.split('-');
      setPickerYear(parseInt(y, 10));
    } else {
      setPickerYear(new Date().getFullYear());
    }
    setMonthPickerVisible(true);
  };

  // Handle Month Selection in Modal
  const handleSelectMonth = (monthIndex: number) => {
    const ym = `${pickerYear}-${String(monthIndex + 1).padStart(2, '0')}`;
    if (pickerTarget === 'GLOBAL') {
      setGlobalMonth(ym);
    } else {
      setFinanceMonth(ym);
    }
    setMonthPickerVisible(false);
  };

  // Handle All Months Selection
  const handleSelectAll = () => {
    if (pickerTarget === 'GLOBAL') {
      setGlobalMonth('ALL');
    } else {
      setFinanceMonth('ALL');
    }
    setMonthPickerVisible(false);
  };

  // Handle Sync with Global (for finance target only)
  const handleSelectSync = () => {
    setFinanceMonth('SYNC');
    setMonthPickerVisible(false);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#059669']} />}
      >
        {/* ─── 1. Header Banner ─── */}
        <View style={styles.banner}>
          <View style={styles.bannerRow}>
            <View style={styles.bannerLeft}>
              <View style={styles.statusBadgeRow}>
                <View style={styles.pulseDot} />
                <Text style={styles.statusBadgeText}>ระบบทำงานปกติ</Text>
              </View>
              <Text style={styles.bannerGreet}>สวัสดี, {user?.first_name || 'ผู้บริหาร'}</Text>
              <Text style={styles.bannerDate}>
                <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.85)" /> {currentDateText}
              </Text>
            </View>
            <Image
              source={require('../../assets/images/bru-logo.png')}
              style={styles.bannerLogo}
              resizeMode="contain"
            />
          </View>

          {/* Food Court Filter Switcher */}
          <View style={styles.filterContainer}>
            {[
              { key: 'ALL', label: 'ภาพรวมทั้งหมด' },
              { key: '1', label: 'ศูนย์อาหาร 1' },
              { key: '2', label: 'ศูนย์อาหาร 2' },
            ].map((tab) => {
              const isActive = selectedFoodCourt === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => setSelectedFoodCourt(tab.key as 'ALL' | '1' | '2')}
                  style={[styles.filterPill, isActive && styles.filterPillActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* [แนวทางที่ 2] Global Month Filter Dropdown */}
          <View style={styles.bannerGlobalFilterRow}>
            <Text style={styles.bannerGlobalFilterLabel}>รอบเดือนภาพรวม:</Text>
            <TouchableOpacity
              style={styles.bannerGlobalFilterBtn}
              onPress={() => openPicker('GLOBAL')}
              activeOpacity={0.8}
            >
              <Ionicons name="calendar" size={14} color="#059669" />
              <Text style={styles.bannerGlobalFilterBtnText}>{formatMonthDisplay(globalMonth)}</Text>
              <Ionicons name="chevron-down" size={13} color="#059669" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── 2. 4 KPI Cards (2x2 Grid) ─── */}
        <View style={styles.kpiGrid}>
          {/* KPI 1: รายได้ที่จัดเก็บได้ (คำนวณตาม globalMonth) */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabel}>รายได้ที่จัดเก็บได้</Text>
              <View style={[styles.kpiIconWrapper, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="wallet" size={18} color="#059669" />
              </View>
            </View>
            <Text style={styles.kpiValue}>฿{globalTotalRevenue.toLocaleString('th-TH')}</Text>
            <View style={styles.kpiFooter}>
              <Text style={styles.kpiSubText}>เป้า ฿{globalTotalBilled.toLocaleString('th-TH')}</Text>
              <View style={[styles.kpiBadge, { backgroundColor: '#D1FAE5' }]}>
                <Text style={[styles.kpiBadgeText, { color: '#065F46' }]}>{globalCollectionRate}% สำเร็จ</Text>
              </View>
            </View>
          </View>

          {/* KPI 2: อัตราครองแผงค้า */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabel}>อัตราครองแผงค้า</Text>
              <View style={[styles.kpiIconWrapper, { backgroundColor: '#F3E8FF' }]}>
                <Ionicons name="storefront" size={18} color="#7C3AED" />
              </View>
            </View>
            <Text style={styles.kpiValue}>{occupancyRate}%</Text>
            <View style={styles.kpiFooter}>
              <Text style={styles.kpiSubText}>เช่า {occupiedStalls}/{currentStalls.length}</Text>
              <View style={[styles.kpiBadge, { backgroundColor: '#EDE9FE' }]}>
                <Text style={[styles.kpiBadgeText, { color: '#6D28D9' }]}>ว่าง {vacantStalls}</Text>
              </View>
            </View>
          </View>

          {/* KPI 3: ผู้เช่าในระบบ */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabel}>ผู้เช่าในระบบ</Text>
              <View style={[styles.kpiIconWrapper, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="people" size={18} color="#2563EB" />
              </View>
            </View>
            <Text style={styles.kpiValue}>
              {totalTenantsCount} <Text style={styles.kpiUnit}>ราย</Text>
            </Text>
            <View style={styles.kpiFooter}>
              <Text style={styles.kpiSubText}>บัญชีลงทะเบียน</Text>
              <TouchableOpacity
                onPress={() => router.push('/(executive)/tenants')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.kpiLink}>ดูทั้งหมด ›</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* KPI 4: รายการที่ต้องติดตาม */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabel}>รายการต้องติดตาม</Text>
              <View style={[styles.kpiIconWrapper, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="alert-circle" size={18} color="#D97706" />
              </View>
            </View>
            <Text style={styles.kpiValue}>
              {pendingBills.length + pendingRepairs.length} <Text style={styles.kpiUnit}>รายการ</Text>
            </Text>
            <View style={styles.kpiFooter}>
              <View style={[styles.kpiBadge, { backgroundColor: '#FEF3C7', marginRight: 4 }]}>
                <Text style={[styles.kpiBadgeText, { color: '#B45309' }]}>บิล {pendingBills.length}</Text>
              </View>
              <View style={[styles.kpiBadge, { backgroundColor: '#FEE2E2' }]}>
                <Text style={[styles.kpiBadgeText, { color: '#B91C1C' }]}>ซ่อม {pendingRepairs.length}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ─── 3. Card 1: สถานะแผงค้า (Occupancy Donut Chart) ─── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleGroup}>
              <Ionicons name="storefront-outline" size={18} color="#059669" style={styles.cardTitleIcon} />
              <Text style={styles.cardTitle}>สถานะล็อค (Occupancy)</Text>
            </View>
            <View style={styles.subTag}>
              <Text style={styles.subTagText}>
                {selectedFoodCourt === 'ALL' ? 'ทุกศูนย์อาหาร' : `ศูนย์อาหาร ${selectedFoodCourt}`}
              </Text>
            </View>
          </View>

          <View style={styles.donutWrapper}>
            <DonutChart
              slices={occupancySlices}
              size={160}
              strokeWidth={24}
              centerLabel={`${occupancyRate}%`}
              centerSublabel="อัตราการเช่า"
            />
          </View>

          <View style={styles.legendWrapper}>
            <LegendItem color="#059669" label="มีผู้เช่าแล้ว" value={occupiedStalls} total={currentStalls.length} />
            <LegendItem color="#D1FAE5" label="ว่าง (พร้อมเช่า)" value={vacantStalls} total={currentStalls.length} />
            <LegendItem color="#F59E0B" label="ปิดซ่อมบำรุง" value={maintenanceStalls} total={currentStalls.length} />
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.rowLabel}>จำนวนล็อคทั้งหมด</Text>
              <Text style={styles.rowValue}>{currentStalls.length} ล็อค</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.cardActionBtn}
            onPress={() => router.push('/(executive)/stalls')}
            activeOpacity={0.7}
          >
            <Text style={styles.cardActionBtnText}>ดูแผนผังแผงค้า</Text>
            <Ionicons name="arrow-forward" size={15} color="#059669" />
          </TouchableOpacity>
        </View>

        {/* ─── 4. Card 2: เปรียบเทียบศูนย์อาหาร 1 vs ศูนย์อาหาร 2 ─── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleGroup}>
              <Ionicons name="bar-chart-outline" size={18} color="#2563EB" style={styles.cardTitleIcon} />
              <Text style={styles.cardTitle}>เปรียบเทียบศูนย์อาหาร</Text>
            </View>
            <View style={[styles.subTag, { backgroundColor: '#EFF6FF' }]}>
              <Text style={[styles.subTagText, { color: '#2563EB' }]}>FC1 vs FC2</Text>
            </View>
          </View>
          <Text style={styles.cardSubtitle}>
            เปรียบเทียบสัดส่วนและอัตราการเช่าของทั้งสองศูนย์อาหารเพื่อประเมินผลการดำเนินงาน
          </Text>

          {/* FC1 Comparison Box */}
          <View style={styles.comparisonBox}>
            <View style={styles.comparisonHeader}>
              <View style={styles.fcTitleRow}>
                <View style={[styles.fcDot, { backgroundColor: '#7C3AED' }]} />
                <Text style={styles.fcName}>ศูนย์อาหาร 1</Text>
              </View>
              <Text style={[styles.fcRateText, { color: '#7C3AED' }]}>{fc1Rate}%</Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${fc1Rate}%`, backgroundColor: '#7C3AED' }]} />
            </View>
            <View style={styles.fcStatsRow}>
              <Text style={styles.fcStatText}>มีผู้เช่า: <Text style={styles.fcStatBold}>{fc1Occupied}</Text>/{fc1Total}</Text>
              <Text style={styles.fcStatText}>ว่าง: <Text style={styles.fcStatBold}>{fc1Vacant}</Text></Text>
              <Text style={styles.fcStatText}>ซ่อม: <Text style={styles.fcStatBold}>{fc1Maint}</Text></Text>
            </View>
          </View>

          {/* FC2 Comparison Box */}
          <View style={styles.comparisonBox}>
            <View style={styles.comparisonHeader}>
              <View style={styles.fcTitleRow}>
                <View style={[styles.fcDot, { backgroundColor: '#2563EB' }]} />
                <Text style={styles.fcName}>ศูนย์อาหาร 2</Text>
              </View>
              <Text style={[styles.fcRateText, { color: '#2563EB' }]}>{fc2Rate}%</Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${fc2Rate}%`, backgroundColor: '#2563EB' }]} />
            </View>
            <View style={styles.fcStatsRow}>
              <Text style={styles.fcStatText}>มีผู้เช่า: <Text style={styles.fcStatBold}>{fc2Occupied}</Text>/{fc2Total}</Text>
              <Text style={styles.fcStatText}>ว่าง: <Text style={styles.fcStatBold}>{fc2Vacant}</Text></Text>
              <Text style={styles.fcStatText}>ซ่อม: <Text style={styles.fcStatBold}>{fc2Maint}</Text></Text>
            </View>
          </View>

          <View style={styles.fcFooter}>
            <Text style={styles.fcFooterLabel}>อัตราครองแผงสูงสุด:</Text>
            <View style={styles.fcBestBadge}>
              <Text style={styles.fcBestBadgeText}>
                {fc1Rate >= fc2Rate ? 'ศูนย์อาหาร 1' : 'ศูนย์อาหาร 2'}
              </Text>
            </View>
          </View>
        </View>

        {/* ─── 5. Card 3: สถานะการเงิน & การจัดเก็บ (Financial Health) ─── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleGroup}>
              <Ionicons name="receipt-outline" size={18} color="#059669" style={styles.cardTitleIcon} />
              <Text style={styles.cardTitle}>สถานะการเงิน & จัดเก็บ</Text>
            </View>

            {/* [แนวทางที่ 1] Specific Month Filter Button */}
            <TouchableOpacity
              style={styles.cardMonthBtn}
              onPress={() => openPicker('FINANCE')}
              activeOpacity={0.8}
            >
              <Ionicons name="calendar-outline" size={13} color="#059669" />
              <Text style={styles.cardMonthBtnText}>
                {formatMonthDisplay(financeMonth, true)}
              </Text>
              <Ionicons name="chevron-down" size={12} color="#059669" />
            </TouchableOpacity>
          </View>

          {/* Subnote indicating active month if sync or custom */}
          <View style={styles.financeSubHeader}>
            <Text style={styles.financeSubHeaderText}>
              รอบข้อมูล: <Text style={styles.financeSubHeaderBold}>{formatMonthDisplay(effectiveFinanceMonth)}</Text>
              {financeMonth === 'SYNC' && ' (ตามภาพรวม)'}
            </Text>
          </View>

          <View style={styles.financeHighlightBox}>
            <View style={styles.financeHighlightRow}>
              <View>
                <Text style={styles.financeHighlightLabel}>ยอดจัดเก็บสำเร็จ</Text>
                <Text style={styles.financeHighlightAmount}>฿{financeTotalRevenue.toLocaleString('th-TH')}</Text>
              </View>
              <Text style={styles.financeHighlightPercent}>{financeCollectionRate}%</Text>
            </View>
            <View style={styles.financeProgressBarTrack}>
              <View style={[styles.financeProgressBarFill, { width: `${financeCollectionRate}%` }]} />
            </View>
          </View>

          <View style={styles.financeRowsContainer}>
            <View style={styles.financeRowItem}>
              <View style={styles.financeRowLeft}>
                <Ionicons name="checkmark-circle" size={16} color="#059669" />
                <Text style={styles.financeRowLabel}>ชำระแล้ว</Text>
              </View>
              <Text style={[styles.financeRowVal, { color: '#059669' }]}>
                ฿{financeTotalRevenue.toLocaleString('th-TH')}
              </Text>
            </View>

            <View style={styles.financeRowItem}>
              <View style={styles.financeRowLeft}>
                <Ionicons name="time" size={16} color="#D97706" />
                <Text style={styles.financeRowLabel}>ค้างชำระ / รอตรวจสลิป</Text>
              </View>
              <Text style={[styles.financeRowVal, { color: '#D97706' }]}>
                ฿{financePendingAmount.toLocaleString('th-TH')}
              </Text>
            </View>

            <View style={styles.financeRowItem}>
              <View style={styles.financeRowLeft}>
                <Ionicons name="calculator-outline" size={16} color="#4B5563" />
                <Text style={styles.financeRowLabel}>ยอดเรียกเก็บทั้งหมด</Text>
              </View>
              <Text style={[styles.financeRowVal, { color: '#1F2937' }]}>
                ฿{financeTotalBilled.toLocaleString('th-TH')}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.cardActionBtn}
            onPress={() => router.push('/(executive)/bills')}
            activeOpacity={0.7}
          >
            <Text style={styles.cardActionBtnText}>ดูรายงานบิลทั้งหมด</Text>
            <Ionicons name="arrow-forward" size={15} color="#059669" />
          </TouchableOpacity>
        </View>

        {/* ─── 6. Card 4: สิ่งที่ต้องติดตาม (Executive Watchlist) ─── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleGroup}>
              <Ionicons name="alert-circle-outline" size={18} color="#DC2626" style={styles.cardTitleIcon} />
              <Text style={styles.cardTitle}>สิ่งที่ต้องติดตาม (Watchlist)</Text>
            </View>
          </View>

          {/* Watchlist Tabs */}
          <View style={styles.watchlistTabs}>
            <TouchableOpacity
              style={[styles.watchlistTab, watchlistTab === 'BILLS' && styles.watchlistTabActive]}
              onPress={() => setWatchlistTab('BILLS')}
              activeOpacity={0.7}
            >
              <Text style={[styles.watchlistTabText, watchlistTab === 'BILLS' && styles.watchlistTabTextActive]}>
                บิลค้างชำระ ({pendingBills.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.watchlistTab, watchlistTab === 'REPAIRS' && styles.watchlistTabActive]}
              onPress={() => setWatchlistTab('REPAIRS')}
              activeOpacity={0.7}
            >
              <Text style={[styles.watchlistTabText, watchlistTab === 'REPAIRS' && styles.watchlistTabTextActive]}>
                งานซ่อม ({pendingRepairs.length})
              </Text>
            </TouchableOpacity>
          </View>

          {watchlistTab === 'BILLS' ? (
            <View style={styles.watchlistContent}>
              {pendingBillsWatchlist.map((bill, idx) => {
                const slotNo =
                  bill.rental_slot?.slot_number ||
                  bill.slot?.slot_number ||
                  bill.contract?.slot?.slot_number ||
                  bill.rental_contract?.rental_slot?.slot_number ||
                  '-';
                const tenantName =
                  bill.contract?.tenant?.first_name
                    ? `${bill.contract.tenant.first_name} ${bill.contract.tenant.last_name || ''}`.trim()
                    : bill.tenant?.first_name
                    ? `${bill.tenant.first_name} ${bill.tenant.last_name || ''}`.trim()
                    : bill.tenant_name || 'ผู้เช่า';
                const monthText = bill.billing_month
                  ? new Date(bill.billing_month).toLocaleDateString('th-TH', { month: 'short', year: '2-digit' })
                  : '-';
                const isOverdue = bill.status === 'OVERDUE';
                const isWaiting = bill.status === 'WAITING_VERIFICATION' || bill.status === 'WAITING';

                return (
                  <View key={bill.id || idx} style={styles.watchlistItem}>
                    <View style={styles.watchlistSlotBadge}>
                      <Text style={styles.watchlistSlotText}>{slotNo}</Text>
                    </View>
                    <View style={styles.watchlistMainInfo}>
                      <Text style={styles.watchlistTitle} numberOfLines={1}>
                        {tenantName}
                      </Text>
                      <Text style={styles.watchlistSubText}>รอบเดือน {monthText}</Text>
                    </View>
                    <View style={styles.watchlistRightInfo}>
                      <Text style={styles.watchlistAmount}>
                        ฿{Number(bill.total_amount || bill.totalAmount || 0).toLocaleString('th-TH')}
                      </Text>
                      <View
                        style={[
                          styles.statusTag,
                          isOverdue
                            ? { backgroundColor: '#FEE2E2' }
                            : isWaiting
                            ? { backgroundColor: '#EFF6FF' }
                            : { backgroundColor: '#FEF3C7' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusTagText,
                            isOverdue
                              ? { color: '#B91C1C' }
                              : isWaiting
                              ? { color: '#1D4ED8' }
                              : { color: '#B45309' },
                          ]}
                        >
                          {isOverdue ? 'เกินกำหนด' : isWaiting ? 'รอตรวจสลิป' : 'รอชำระ'}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}

              {pendingBillsWatchlist.length === 0 && (
                <View style={styles.emptyWatchlist}>
                  <Ionicons name="checkmark-circle-outline" size={36} color="#059669" />
                  <Text style={styles.emptyWatchlistText}>ไม่มีบิลค้างชำระในขณะนี้</Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.cardActionBtn}
                onPress={() => router.push('/(executive)/bills')}
                activeOpacity={0.7}
              >
                <Text style={styles.cardActionBtnText}>ดูบิลทั้งหมด ({pendingBills.length})</Text>
                <Ionicons name="arrow-forward" size={15} color="#059669" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.watchlistContent}>
              {pendingRepairsWatchlist.map((repair, idx) => {
                const slotNo =
                  repair.slot?.slot_number ||
                  repair.rental_slot?.slot_number ||
                  (repair.slot_id ? `#${repair.slot_id}` : '-');
                const inProgress = repair.status === 'IN_PROGRESS';
                const reqDate = repair.requested_at || repair.created_at;
                const dateText = reqDate
                  ? new Date(reqDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
                  : '-';

                return (
                  <View key={repair.id || idx} style={styles.watchlistItem}>
                    <View style={[styles.watchlistSlotBadge, { backgroundColor: '#FEE2E2' }]}>
                      <Text style={[styles.watchlistSlotText, { color: '#B91C1C' }]}>{slotNo}</Text>
                    </View>
                    <View style={styles.watchlistMainInfo}>
                      <Text style={styles.watchlistTitle} numberOfLines={1}>
                        {repair.title}
                      </Text>
                      <Text style={styles.watchlistSubText}>
                        หมวด: {repair.category || 'ทั่วไป'} • {dateText}
                      </Text>
                    </View>
                    <View style={styles.watchlistRightInfo}>
                      <View
                        style={[
                          styles.statusTag,
                          inProgress ? { backgroundColor: '#EFF6FF' } : { backgroundColor: '#FFEDD5' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusTagText,
                            inProgress ? { color: '#1D4ED8' } : { color: '#C2410C' },
                          ]}
                        >
                          {inProgress ? 'กำลังซ่อม' : 'รอดำเนินการ'}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}

              {pendingRepairsWatchlist.length === 0 && (
                <View style={styles.emptyWatchlist}>
                  <Ionicons name="checkmark-circle-outline" size={36} color="#059669" />
                  <Text style={styles.emptyWatchlistText}>ไม่มีงานซ่อมค้างในขณะนี้</Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.cardActionBtn}
                onPress={() => router.push('/(executive)/repairs')}
                activeOpacity={0.7}
              >
                <Text style={styles.cardActionBtnText}>ดูงานซ่อมทั้งหมด ({pendingRepairs.length})</Text>
                <Ionicons name="arrow-forward" size={15} color="#059669" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ─── 7. Card 5: ข้อมูลเชิงลึกงานซ่อมบำรุง (Maintenance Insights) ─── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleGroup}>
              <Ionicons name="construct-outline" size={18} color="#7C3AED" style={styles.cardTitleIcon} />
              <Text style={styles.cardTitle}>ข้อมูลเชิงลึกงานซ่อมบำรุง</Text>
            </View>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>งานซ่อมรอดำเนินการ</Text>
            <Text style={[styles.rowValue, pendingRepairs.length > 0 && styles.red]}>
              {pendingRepairs.length} รายการ
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>งานซ่อมเสร็จสิ้น</Text>
            <Text style={styles.rowValue}>
              {currentRepairs.filter((r) => (r.status || '').toUpperCase() === 'COMPLETED').length} รายการ
            </Text>
          </View>

          {categoryList.length > 0 && (
            <>
              <View style={styles.divider} />
              <Text style={styles.subHeaderTitle}>🏷️ ประเภทงานที่แจ้งซ่อมบ่อย</Text>
              {categoryList.map((item) => (
                <CategoryBarItem
                  key={item.category}
                  label={item.category}
                  count={item.count}
                  percent={item.percent}
                  color={item.color}
                />
              ))}
            </>
          )}

          {slotList.length > 0 && (
            <>
              <View style={styles.divider} />
              <Text style={styles.subHeaderTitle}>📍 ล็อคที่แจ้งซ่อมบ่อยที่สุด</Text>
              {slotList.map((item, index) => (
                <SlotRankItem
                  key={item.slot_number}
                  rank={index}
                  slotNumber={item.slot_number}
                  count={item.count}
                  maxCount={maxSlotCount}
                />
              ))}
            </>
          )}

          <TouchableOpacity
            style={styles.cardActionBtn}
            onPress={() => router.push('/(executive)/repairs')}
            activeOpacity={0.7}
          >
            <Text style={styles.cardActionBtnText}>ดูงานซ่อมบำรุงทั้งหมด</Text>
            <Ionicons name="arrow-forward" size={15} color="#059669" />
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* ─── 8. Month Picker Modal (Shared between Global & Finance) ─── */}
      <Modal visible={monthPickerVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setMonthPickerVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalBox}>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <Text style={styles.modalHeaderTitle}>
                    {pickerTarget === 'GLOBAL' ? 'เลือกรอบเดือนภาพรวม' : 'เลือกรอบเดือนสถานะการเงิน'}
                  </Text>
                  <TouchableOpacity
                    style={styles.modalCloseBtn}
                    onPress={() => setMonthPickerVisible(false)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close" size={22} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                {/* Year Controller */}
                <View style={styles.modalYearRow}>
                  <TouchableOpacity
                    style={styles.modalYearBtn}
                    onPress={() => setPickerYear((y) => y - 1)}
                  >
                    <Ionicons name="chevron-back" size={20} color="#374151" />
                  </TouchableOpacity>
                  <Text style={styles.modalYearText}>ปี พ.ศ. {pickerYear + 543}</Text>
                  <TouchableOpacity
                    style={styles.modalYearBtn}
                    onPress={() => setPickerYear((y) => y + 1)}
                  >
                    <Ionicons name="chevron-forward" size={20} color="#374151" />
                  </TouchableOpacity>
                </View>

                {/* Months Grid (12 Months) */}
                <View style={styles.modalGrid}>
                  {THAI_MONTHS_SHORT.map((monthName, idx) => {
                    const ym = `${pickerYear}-${String(idx + 1).padStart(2, '0')}`;
                    const hasData = availableMonths.includes(ym);
                    const currentSelected = pickerTarget === 'GLOBAL'
                      ? globalMonth
                      : (financeMonth === 'SYNC' ? globalMonth : financeMonth);
                    const isSelected = currentSelected === ym;

                    return (
                      <TouchableOpacity
                        key={monthName}
                        style={[
                          styles.modalMonthCell,
                          isSelected && styles.modalMonthCellActive,
                          !hasData && !isSelected && styles.modalMonthCellEmpty,
                        ]}
                        onPress={() => handleSelectMonth(idx)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.modalMonthCellText,
                            isSelected && styles.modalMonthCellTextActive,
                            !hasData && !isSelected && styles.modalMonthCellTextEmpty,
                          ]}
                        >
                          {monthName}
                        </Text>
                        {hasData && !isSelected && <View style={styles.modalDataDot} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Bottom Quick Actions */}
                <View style={styles.modalActionButtons}>
                  {pickerTarget === 'FINANCE' && (
                    <TouchableOpacity
                      style={[
                        styles.modalActionSyncBtn,
                        financeMonth === 'SYNC' && styles.modalActionSyncBtnActive,
                      ]}
                      onPress={handleSelectSync}
                    >
                      <Ionicons
                        name="link-outline"
                        size={16}
                        color={financeMonth === 'SYNC' ? '#fff' : '#059669'}
                      />
                      <Text
                        style={[
                          styles.modalActionSyncText,
                          financeMonth === 'SYNC' && styles.modalActionSyncTextActive,
                        ]}
                      >
                        ใช้ตามภาพรวม ({formatMonthDisplay(globalMonth)})
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[
                      styles.modalActionAllBtn,
                      (pickerTarget === 'GLOBAL' ? globalMonth === 'ALL' : financeMonth === 'ALL') &&
                        styles.modalActionAllBtnActive,
                    ]}
                    onPress={handleSelectAll}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color={(pickerTarget === 'GLOBAL' ? globalMonth === 'ALL' : financeMonth === 'ALL') ? '#fff' : '#4B5563'}
                    />
                    <Text
                      style={[
                        styles.modalActionAllText,
                        (pickerTarget === 'GLOBAL' ? globalMonth === 'ALL' : financeMonth === 'ALL') &&
                          styles.modalActionAllTextActive,
                      ]}
                    >
                      แสดงทุกช่วงเวลา (สะสม)
                    </Text>
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

// ─── Stylesheet ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  banner: {
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    marginBottom: 16,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerLeft: {
    flex: 1,
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    marginBottom: 8,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#34D399',
    marginRight: 6,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  bannerGreet: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  bannerDate: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  bannerLogo: {
    width: 65,
    height: 65,
    marginLeft: 12,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.12)',
    borderRadius: 16,
    padding: 4,
    marginTop: 16,
  },
  filterPill: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 12,
  },
  filterPillActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  filterPillTextActive: {
    color: '#059669',
    fontWeight: '800',
  },

  // Global Month Filter in Banner
  bannerGlobalFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
  },
  bannerGlobalFilterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
  },
  bannerGlobalFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  bannerGlobalFilterBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },

  // KPI Grid
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  kpiCard: {
    width: '47%',
    margin: '1.5%',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    justifyContent: 'space-between',
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    flex: 1,
  },
  kpiIconWrapper: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.3,
  },
  kpiUnit: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  kpiFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  kpiSubText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
    flex: 1,
  },
  kpiBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  kpiBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  kpiLink: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },

  // Shared Card Styles
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardTitleIcon: {
    marginRight: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1F2937',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 14,
    lineHeight: 17,
  },
  subTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  subTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  cardMonthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  cardMonthBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  financeSubHeader: {
    marginBottom: 10,
  },
  financeSubHeaderText: {
    fontSize: 11,
    color: '#6B7280',
  },
  financeSubHeaderBold: {
    fontWeight: '700',
    color: '#059669',
  },

  donutWrapper: {
    alignItems: 'center',
    marginVertical: 12,
  },
  legendWrapper: {
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  rowLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  rowValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  red: {
    color: '#EF4444',
  },
  cardActionBtn: {
    marginTop: 12,
    paddingVertical: 10,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  cardActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },

  // Comparison Boxes
  comparisonBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  comparisonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  fcTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fcDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  fcName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  fcRateText: {
    fontSize: 14,
    fontWeight: '800',
  },
  progressBarTrack: {
    height: 7,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  fcStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fcStatText: {
    fontSize: 11,
    color: '#6B7280',
  },
  fcStatBold: {
    fontWeight: '700',
    color: '#1F2937',
  },
  fcFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  fcFooterLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  fcBestBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  fcBestBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7C3AED',
  },

  // Financial Section
  financeHighlightBox: {
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  financeHighlightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  financeHighlightLabel: {
    fontSize: 11,
    color: '#065F46',
    fontWeight: '600',
    marginBottom: 2,
  },
  financeHighlightAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: '#047857',
    letterSpacing: -0.4,
  },
  financeHighlightPercent: {
    fontSize: 16,
    fontWeight: '900',
    color: '#047857',
  },
  financeProgressBarTrack: {
    height: 6,
    backgroundColor: '#A7F3D0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  financeProgressBarFill: {
    height: '100%',
    backgroundColor: '#059669',
    borderRadius: 3,
  },
  financeRowsContainer: {
    gap: 6,
  },
  financeRowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
  },
  financeRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  financeRowLabel: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  financeRowVal: {
    fontSize: 13,
    fontWeight: '800',
  },

  // Watchlist Section
  watchlistTabs: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 3,
    marginBottom: 12,
  },
  watchlistTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 9,
  },
  watchlistTabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  watchlistTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  watchlistTabTextActive: {
    color: '#111827',
    fontWeight: '700',
  },
  watchlistContent: {
    gap: 8,
  },
  watchlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  watchlistSlotBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  watchlistSlotText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7C3AED',
  },
  watchlistMainInfo: {
    flex: 1,
    marginRight: 8,
  },
  watchlistTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
  },
  watchlistSubText: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  watchlistRightInfo: {
    alignItems: 'flex-end',
  },
  watchlistAmount: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 3,
  },
  statusTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusTagText: {
    fontSize: 9,
    fontWeight: '700',
  },
  emptyWatchlist: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyWatchlistText: {
    fontSize: 12,
    color: '#6B7280',
  },

  // Insights Section
  subHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginTop: 6,
    marginBottom: 10,
  },
  bottomSpacer: {
    height: 24,
  },

  // ─── Modal Styles ──────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    width: '100%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalYearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 14,
    paddingHorizontal: 8,
  },
  modalYearBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  modalYearText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
  },
  modalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalMonthCell: {
    width: '31%',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    position: 'relative',
  },
  modalMonthCellActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  modalMonthCellEmpty: {
    backgroundColor: '#fff',
    borderColor: '#F3F4F6',
  },
  modalMonthCellText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalMonthCellTextActive: {
    color: '#fff',
    fontWeight: '800',
  },
  modalMonthCellTextEmpty: {
    color: '#9CA3AF',
    fontWeight: '500',
  },
  modalDataDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
  },
  modalActionButtons: {
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  modalActionSyncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 6,
  },
  modalActionSyncBtnActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  modalActionSyncText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  modalActionSyncTextActive: {
    color: '#fff',
  },
  modalActionAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    gap: 6,
  },
  modalActionAllBtnActive: {
    backgroundColor: '#374151',
  },
  modalActionAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  modalActionAllTextActive: {
    color: '#fff',
  },
});
