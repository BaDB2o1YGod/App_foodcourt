import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { billsAPI } from '../../services/api';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

interface ExpenseItem {
  expense_id: number;
  billing_month: string;
  rent_amount: number;
  water_cost: number;
  electricity_cost: number;
  grease_trap_fee?: number | null;
  greaseTrapFee?: number | null;
  fine_amount?: number | null;
  penalty_amount?: number | null;
  late_fee?: number | null;
  other_fee?: number | null;
  water_units?: number | null;
  electricity_units?: number | null;
  total_amount: number;
  due_date: string;
  status: string;
  contract?: {
    slot?: {
      slot_number?: string;
    };
  };
}

export default function Expenses() {
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const res = await billsAPI.getAll();
      setExpenses(res.data.data || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData().finally(() => setLoading(false)); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7C3AED']} />}
    >
      {expenses.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyText}>ยังไม่มีข้อมูลค่าใช้จ่าย</Text>
        </View>
      ) : (
        expenses.map((exp) => {
          const rent = Number(exp.rent_amount || 0);
          const water = Number(exp.water_cost || 0);
          const electricity = Number(exp.electricity_cost || 0);
          const greaseTrap = Number(exp.grease_trap_fee ?? exp.greaseTrapFee ?? 0);
          const fine = Number(exp.fine_amount ?? exp.penalty_amount ?? exp.late_fee ?? 0);
          const explicitOther = Number(exp.other_fee || 0);

          const accountedSum = rent + water + electricity + greaseTrap + fine + explicitOther;
          const total = Number(exp.total_amount || 0);
          const diff = Math.round((total - accountedSum) * 100) / 100;
          const otherFee = explicitOther > 0 ? explicitOther : (diff > 0 ? diff : 0);

          const waterLabel = exp.water_units != null ? `ค่าน้ำ (${exp.water_units} หน่วย)` : 'ค่าน้ำ';
          const elecLabel = exp.electricity_units != null ? `ค่าไฟ (${exp.electricity_units} หน่วย)` : 'ค่าไฟ';

          return (
            <View key={exp.expense_id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.month}>
                    {new Date(exp.billing_month).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
                  </Text>
                  {exp.contract?.slot?.slot_number && (
                    <Text style={styles.slotText}>ล็อค {exp.contract.slot.slot_number}</Text>
                  )}
                </View>
                <StatusBadge status={exp.status} size="sm" />
              </View>

              <View style={styles.rows}>
                <Row label="ค่าเช่า" value={rent} />
                <Row label={waterLabel} value={water} />
                <Row label={elecLabel} value={electricity} />
                {greaseTrap > 0 && <Row label="ค่าดักไขมัน" value={greaseTrap} />}
                {fine > 0 && <Row label="ค่าปรับ" value={fine} highlight />}
                {otherFee > 0 && <Row label="ค่าบริการอื่นๆ" value={otherFee} />}
              </View>

              <View style={styles.total}>
                <Text style={styles.totalLabel}>รวมทั้งหมด</Text>
                <Text style={styles.totalValue}>฿{total.toLocaleString()}</Text>
              </View>
              <Text style={styles.dueDate}>
                ครบกำหนด: {new Date(exp.due_date).toLocaleDateString('th-TH')}
              </Text>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

function Row({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, highlight && styles.rowLabelHighlight]}>{label}</Text>
      <Text style={[styles.rowValue, highlight && styles.rowValueHighlight]}>
        ฿{Number(value || 0).toLocaleString()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6', padding: 16 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  month: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  slotText: { fontSize: 13, color: '#6B7280', marginTop: 2, fontWeight: '500' },
  rows: { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 10, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rowLabel: { color: '#6B7280', fontSize: 14 },
  rowLabelHighlight: { color: '#DC2626', fontWeight: '500' },
  rowValue: { color: '#1F2937', fontSize: 14, fontWeight: '500' },
  rowValueHighlight: { color: '#DC2626', fontWeight: '600' },
  total: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#F5F3FF', borderRadius: 10, padding: 10,
  },
  totalLabel: { fontWeight: '700', color: '#7C3AED' },
  totalValue: { fontWeight: '800', fontSize: 16, color: '#7C3AED' },
  dueDate: { color: '#9CA3AF', fontSize: 12, marginTop: 8 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#9CA3AF', fontSize: 15 },
});
