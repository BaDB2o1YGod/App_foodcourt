import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { stallsAPI, billsAPI, maintenanceAPI } from '../../services/api';
import { exportMaintenanceReportPDF, exportOverdueBillsReportPDF } from '../../services/pdfReportService';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { DonutSlice, DonutChart, LegendItem, CategoryBarItem, SlotRankItem } from '../../components/ui/Charts';

export default function AdminReports() {
  const [data, setData] = useState({
    totalStalls: 0, occupied: 0, vacant: 0, maintenance: 0, occupancyRate: 0,
    totalBills: 0, paidBills: 0, waitingBills: 0, pendingBills: 0, unbilledBills: 0, targetBase: 0, paidRate: 0,
    pendingRepairs: 0, completedRepairs: 0,
    categoryList: [] as Array<{ category: string; count: number; percent: number; color: string }>,
    slotList: [] as Array<{ slot_number: string; count: number }>,
    maxSlotCount: 1,
  });
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Date Range Filter
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [endDate, setEndDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0));
  const [pickerMode, setPickerMode] = useState<'start' | 'end' | null>(null);

  const [rawBills, setRawBills] = useState<any[]>([]);
  const [rawRepairs, setRawRepairs] = useState<any[]>([]);
  const [exportingType, setExportingType] = useState<string | null>(null);

  const fetchData = async (targetStart: Date, targetEnd: Date) => {
    try {
      const [stallsRes, billsRes, repairsRes] = await Promise.all([
        stallsAPI.getAll(),
        billsAPI.getAll(),
        maintenanceAPI.getAll(),
      ]);
      const rawStalls = stallsRes.data.data || [];
      
      // De-duplicate stalls by slot_number (same logic as stalls.tsx)
      const map = new Map<string, any>();
      for (const s of rawStalls) {
        const key = s.slot_number;
        const existing = map.get(key);
        const hasActive = (x: any) => x.rental_contracts?.some((c: any) => c.status === 'ACTIVE');
        if (!existing || (!hasActive(existing) && hasActive(s))) {
          map.set(key, s);
        }
      }
      const stalls = Array.from(map.values());
      const occ = stalls.filter((s: any) => s.status === 'OCCUPIED').length;
      const vac = stalls.filter((s: any) => s.status === 'VACANT').length;
      const maint = stalls.filter((s: any) => s.status === 'MAINTENANCE').length;
      
      const allBills = billsRes.data.data || [];
      const allRepairs = repairsRes.data.data || [];

      // Filter by Date Range
      const targetStartStartOfDay = new Date(targetStart);
      targetStartStartOfDay.setHours(0, 0, 0, 0);
      
      const targetEndEndOfDay = new Date(targetEnd);
      targetEndEndOfDay.setHours(23, 59, 59, 999);

      const currentMonthBills = allBills.filter((b: any) => {
        if (!b.billing_month && !b.created_at) return false;
        const d = new Date(b.billing_month || b.created_at);
        return d >= targetStartStartOfDay && d <= targetEndEndOfDay;
      });

      const currentMonthRepairs = allRepairs.filter((r: any) => {
        if (!r.requested_at) return false;
        const d = new Date(r.requested_at);
        return d >= targetStartStartOfDay && d <= targetEndEndOfDay;
      });

      setRawBills(currentMonthBills);
      setRawRepairs(currentMonthRepairs);
      
      const paidCount = currentMonthBills.filter((b: any) => b.status === 'PAID').length;
      const waitingCount = currentMonthBills.filter((b: any) => b.status === 'WAITING_VERIFICATION' || b.status === 'WAITING').length;
      const pendingCount = currentMonthBills.filter((b: any) => b.status === 'PENDING' || b.status === 'OVERDUE').length;
      
      // Rough estimation for unbilled: compare occupied stalls vs billed this month
      const targetBase = Math.max(occ, currentMonthBills.length);
      const unbilledCount = Math.max(0, targetBase - currentMonthBills.length);

      // Repairs breakdown
      const categoryMap: { [key: string]: number } = {};
      const slotMap: { [key: string]: number } = {};
      
      currentMonthRepairs.forEach((r: any) => {
        const cat = r.category || 'อื่นๆ';
        categoryMap[cat] = (categoryMap[cat] || 0) + 1;

        const fcName = r.slot?.food_court?.name ? `${r.slot.food_court.name} - ` : '';
        const slotNum = r.slot?.slot_number ? `${fcName}ล็อค ${r.slot.slot_number}` : (r.slot_id ? `ล็อค #${r.slot_id}` : 'ไม่ระบุล็อค');
        slotMap[slotNum] = (slotMap[slotNum] || 0) + 1;
      });

      const categoryColorMap: { [key: string]: string } = {
        'ประปา': '#3B82F6',
        'ไฟฟ้า': '#F59E0B',
        'อุปกรณ์': '#8B5CF6',
        'โครงสร้าง': '#6B7280',
        'อื่นๆ': '#10B981',
      };

      const categoryList = Object.keys(categoryMap).map((cat) => ({
        category: cat,
        count: categoryMap[cat],
        percent: currentMonthRepairs.length > 0 ? Math.round((categoryMap[cat] / currentMonthRepairs.length) * 100) : 0,
        color: categoryColorMap[cat] || '#80639A',
      })).sort((a, b) => b.count - a.count);

      const slotList = Object.keys(slotMap).map((slotNum) => ({
        slot_number: slotNum,
        count: slotMap[slotNum],
      })).sort((a, b) => b.count - a.count).slice(0, 5);

      const maxSlotCount = slotList.length > 0 ? Math.max(...slotList.map((s) => s.count)) : 1;

      setData({
        totalStalls: stalls.length,
        occupied: occ,
        vacant: vac,
        maintenance: maint,
        occupancyRate: stalls.length > 0 ? Math.round((occ / stalls.length) * 100) : 0,
        totalBills: currentMonthBills.length,
        paidBills: paidCount,
        waitingBills: waitingCount,
        pendingBills: pendingCount,
        unbilledBills: unbilledCount,
        targetBase: targetBase,
        paidRate: targetBase > 0 ? Math.round((paidCount / targetBase) * 100) : 0,
        pendingRepairs: currentMonthRepairs.filter((r: any) => r.status === 'PENDING').length,
        completedRepairs: currentMonthRepairs.filter((r: any) => r.status === 'COMPLETED').length,
        categoryList,
        slotList,
        maxSlotCount,
      });
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchData(startDate, endDate).finally(() => setLoading(false));
  }, [startDate, endDate]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData(startDate, endDate);
    setRefreshing(false);
  };

  const handleDateChange = (event: any, date?: Date) => {
    const mode = pickerMode;
    setPickerMode(null);
    if (event.type === 'set' && date) {
      if (mode === 'start') setStartDate(date);
      if (mode === 'end') setEndDate(date);
    }
  };

  const formatDate = (date: Date) => {
    const d = date.getDate();
    const m = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][date.getMonth()];
    const y = date.getFullYear() + 543;
    return `${d} ${m} ${y}`;
  };
  const rangeLabel = `${formatDate(startDate)} - ${formatDate(endDate)}`;

  const handleExportBillsPDF = async () => {
    try {
      setExportingType('bills');
      await exportOverdueBillsReportPDF(rawBills, `${rangeLabel}`, data.paidBills, data.waitingBills, data.pendingBills, data.unbilledBills, data.targetBase, data.paidRate);
    } catch (e) {
      Alert.alert('ผิดพลาด', 'ไม่สามารถส่งออก PDF ได้');
    } finally {
      setExportingType(null);
    }
  };

  const handleExportRepairsPDF = async () => {
    try {
      setExportingType('repairs');
      await exportMaintenanceReportPDF(rawRepairs, `${rangeLabel}`, data.categoryList, data.slotList, data.maxSlotCount);
    } catch (e) {
      Alert.alert('ผิดพลาด', 'ไม่สามารถส่งออก PDF ได้');
    } finally {
      setExportingType(null);
    }
  };

  if (loading && !refreshing) return <LoadingSpinner />;

  const stallSlices: DonutSlice[] = [
    { color: '#059669', value: data.occupied },
    { color: '#D1FAE5', value: data.vacant },
    { color: '#F59E0B', value: data.maintenance },
  ];

  const billSlices: DonutSlice[] = [
    { color: '#10B981', value: data.paidBills },
    { color: '#F59E0B', value: data.waitingBills },
    { color: '#EF4444', value: data.pendingBills },
    { color: '#9CA3AF', value: data.unbilledBills },
  ];

  return (
    <View style={styles.flex1}>
      <View style={styles.filterBar}>
        <Text style={styles.filterLabel}>ตั้งแต่:</Text>
        <TouchableOpacity style={styles.dateBtn} onPress={() => setPickerMode('start')}>
          <Ionicons name="calendar-outline" size={16} color="#4B5563" />
          <Text style={styles.dateText}>{formatDate(startDate)}</Text>
        </TouchableOpacity>
        
        <Text style={[styles.filterLabel, {marginLeft: 8}]}>ถึง:</Text>
        <TouchableOpacity style={styles.dateBtn} onPress={() => setPickerMode('end')}>
          <Ionicons name="calendar-outline" size={16} color="#4B5563" />
          <Text style={styles.dateText}>{formatDate(endDate)}</Text>
        </TouchableOpacity>
      </View>
      
      {pickerMode !== null && (
        <DateTimePicker
          value={pickerMode === 'start' ? startDate : endDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}

      <ScrollView 
        style={styles.container} 
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* ── Donut Chart: สถานะล็อค ── */}
        <Section title="🏪 สถานะล็อค (Occupancy)">
          <View style={styles.donutWrapper}>
            <DonutChart slices={stallSlices} size={160} strokeWidth={26} centerLabel={`${data.occupancyRate}%`} centerSublabel="อัตราการเช่า" />
          </View>
          <View style={styles.legendWrapper}>
            <LegendItem color="#059669" label="มีผู้เช่า" value={data.occupied} total={data.totalStalls} />
            <LegendItem color="#D1FAE5" label="ว่าง" value={data.vacant} total={data.totalStalls} />
            <LegendItem color="#F59E0B" label="ซ่อมบำรุง" value={data.maintenance} total={data.totalStalls} />
            <View style={styles.divider} />
            <StatRow label="ล็อคทั้งหมด" value={data.totalStalls} />
          </View>
        </Section>

        {/* ── Donut Chart: บิลและการชำระเงิน ── */}
        <Section title="💰 บิลและการชำระเงิน">
          <View style={styles.donutWrapper}>
            <DonutChart slices={billSlices} size={160} strokeWidth={26} centerLabel={`${data.paidRate}%`} centerSublabel="อัตราจัดเก็บ" />
          </View>
          <View style={styles.legendWrapper}>
            <LegendItem color="#10B981" label="ชำระแล้ว" value={data.paidBills} total={data.targetBase} />
            <LegendItem color="#F59E0B" label="รอยืนยันสลิป" value={data.waitingBills} total={data.targetBase} />
            <LegendItem color="#EF4444" label="รอชำระ" value={data.pendingBills} total={data.targetBase} />
            <LegendItem color="#9CA3AF" label="ยังไม่ออกบิล" value={data.unbilledBills} total={data.targetBase} />
            <View style={styles.divider} />
            <StatRow label="บิลที่ออกแล้ว" value={data.totalBills} />
          </View>
          
          <TouchableOpacity style={styles.pdfBtn} onPress={handleExportBillsPDF} disabled={exportingType === 'bills'}>
            {exportingType === 'bills' ? <ActivityIndicator size="small" color="#DC2626" /> : (
              <><Ionicons name="document-text" size={18} color="#DC2626" /><Text style={styles.pdfBtnText}>ส่งออก PDF รายงานบิลค่าเช่า</Text></>
            )}
          </TouchableOpacity>
        </Section>

        {/* ── งานซ่อม ── */}
        <Section title="🔧 งานซ่อม">
          <StatRow label="รอดำเนินการ" value={data.pendingRepairs} danger={data.pendingRepairs > 0} />
          <StatRow label="เสร็จสิ้น" value={data.completedRepairs} />

          {data.categoryList.length > 0 && (
            <>
              <View style={styles.divider} />
              <Text style={styles.subHeaderTitle}>🏷️ ประเภทงานที่แจ้งซ่อมบ่อย</Text>
              {data.categoryList.map((item) => (
                <CategoryBarItem key={item.category} label={item.category} count={item.count} percent={item.percent} color={item.color} />
              ))}
            </>
          )}

          {data.slotList.length > 0 && (
            <>
              <View style={styles.divider} />
              <Text style={styles.subHeaderTitle}>ล็อคที่แจ้งซ่อมบ่อยที่สุด</Text>
              {data.slotList.map((item, index) => (
                <SlotRankItem key={item.slot_number} rank={index} slotNumber={item.slot_number} count={item.count} maxCount={data.maxSlotCount} />
              ))}
            </>
          )}

          <TouchableOpacity style={styles.pdfBtnPurple} onPress={handleExportRepairsPDF} disabled={exportingType === 'repairs'}>
            {exportingType === 'repairs' ? <ActivityIndicator size="small" color="#7C3AED" /> : (
              <><Ionicons name="document-text" size={18} color="#7C3AED" /><Text style={styles.pdfBtnTextPurple}>ส่งออก PDF รายงานแจ้งซ่อม</Text></>
            )}
          </TouchableOpacity>
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function StatRow({ label, value, highlight, danger }: { label: string; value: any; highlight?: boolean; danger?: boolean }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, highlight && styles.highlight, danger && styles.danger]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1, backgroundColor: '#F3F4F6' },
  container: { flex: 1, padding: 16 },
  filterBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  filterLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
  dateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
  },
  dateText: { fontSize: 14, color: '#4B5563', fontWeight: '500' },
  section: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 12 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  statLabel: { fontSize: 14, color: '#6B7280' },
  statValue: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  highlight: { color: '#7C3AED' },
  danger: { color: '#EF4444' },
  donutWrapper: { alignItems: 'center', marginBottom: 16 },
  legendWrapper: { marginTop: 4 },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 8 },
  subHeaderTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginTop: 10, marginBottom: 12 },

  pdfBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 16, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10,
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FCA5A5',
  },
  pdfBtnText: { fontSize: 13, fontWeight: '700', color: '#DC2626' },
  pdfBtnPurple: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 16, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10,
    backgroundColor: '#F5F3FF', borderWidth: 1, borderColor: '#DDD6FE',
  },
  pdfBtnTextPurple: { fontSize: 13, fontWeight: '700', color: '#7C3AED' },
});
