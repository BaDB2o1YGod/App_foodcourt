import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { billsAPI, settingsAPI, stallsAPI } from '../../services/api';
import { MaterialIcons } from '@expo/vector-icons';

const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

function generateBillingMonths(count = 6) {
  const result: { key: string; label: string; dateObj: Date }[] = [];
  const now = new Date();
  // Allow picking from previous month up to 4 months ahead
  for (let i = -1; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const key = `${y}-${String(m + 1).padStart(2, '0')}`;
    const label = `${THAI_MONTHS[m]} ${y + 543}`;
    result.push({ key, label, dateObj: d });
  }
  return result;
}

const BILLING_MONTHS = generateBillingMonths();

export default function MonthlyBilling() {
  const params = useLocalSearchParams();
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(params.slot_id as string || null);
  const [selectedSlotNumber, setSelectedSlotNumber] = useState<string>(params.slot_number as string || '');
  
  const [stalls, setStalls] = useState<any[]>([]);
  const [showStallPicker, setShowStallPicker] = useState(false);

  const [billingMonth, setBillingMonth] = useState(BILLING_MONTHS[1]); // default = current month (index 1 because -1 is previous)
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const [loading, setLoading] = useState(false);
  const [billData, setBillData] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dueDateStr, setDueDateStr] = useState('');
  const [dueDay, setDueDay] = useState(10);

  // Fetch configured due day of month from settings
  useEffect(() => {
    settingsAPI.getUtilityRates()
      .then((res) => {
        const rates = res.data.data || {};
        const d = parseInt(rates.dueDayOfMonth || rates.paymentDueDays, 10);
        if (d && !isNaN(d) && d > 0 && d <= 31) {
          setDueDay(d);
        }
      })
      .catch(() => {});

    // Fetch stalls if no slot_id provided
    if (!params.slot_id) {
      stallsAPI.getAll({ status: 'OCCUPIED' })
        .then((res) => {
          const data = res.data.data || [];
          data.sort((a: any, b: any) => a.slot_number.localeCompare(b.slot_number, undefined, { numeric: true, sensitivity: 'base' }));
          setStalls(data);
        })
        .catch(() => {});
    }
  }, [params.slot_id]);

  // Calculate default due date based on selected billing month and dueDay setting (default 10th of next month)
  useEffect(() => {
    if (billingMonth) {
      const d = billingMonth.dateObj;
      const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, dueDay);
      const y = nextMonth.getFullYear();
      const m = String(nextMonth.getMonth() + 1).padStart(2, '0');
      const dd = String(nextMonth.getDate()).padStart(2, '0');
      setDueDateStr(`${y}-${m}-${dd}`);
    }
  }, [billingMonth, dueDay]);

  // Fetch bill breakdown
  const calculateBill = async () => {
    if (!selectedSlotId || !billingMonth) {
      setBillData(null);
      return;
    }
    setLoading(true);
    try {
      const res = await billsAPI.calculate({
        slot_id: parseInt(selectedSlotId, 10),
        month: billingMonth.key
      });
      setBillData(res.data.data);
    } catch (e: any) {
      // It will throw 404 if no meter recorded or no active contract found
      setBillData(null);
      const msg = e?.response?.data?.message || 'ไม่พบข้อมูล หรือ ยังไม่มีการจดมิเตอร์ในเดือนนี้';
      Alert.alert('ข้อมูลไม่พร้อม', msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculateBill();
  }, [selectedSlotId, billingMonth]);

  const handleCreateBill = async () => {
    if (!billData) return;
    if (!dueDateStr) {
      Alert.alert('แจ้งเตือน', 'กรุณาระบุวันครบกำหนดชำระ');
      return;
    }

    // basic date validation
    const dueDate = new Date(dueDateStr);
    if (isNaN(dueDate.getTime())) {
      Alert.alert('รูปแบบวันที่ผิด', 'กรุณาใช้วันที่รูปแบบ YYYY-MM-DD');
      return;
    }

    Alert.alert(
      'ยืนยันการตั้งหนี้',
      `ยอดชำระ: ${billData.amounts.total.toLocaleString()} บาท\nสำหรับบิลรอบ: ${billingMonth.label}`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ยืนยันสร้างบิล',
          onPress: async () => {
            setSubmitting(true);
            try {
              await billsAPI.create({
                slot_id: parseInt(selectedSlotId!, 10),
                billing_month: billingMonth.key,
                water_cost: billData.amounts.water,
                electricity_cost: billData.amounts.electric,
                dueDate: dueDateStr
              });
              Alert.alert('สำเร็จ', 'สร้างรายการบิลเรียบร้อยแล้ว', [
                { text: 'ตกลง', onPress: () => router.back() }
              ]);
            } catch (e: any) {
              Alert.alert('เกิดข้อผิดพลาด', e?.response?.data?.message || 'ไม่สามารถสร้างบิลได้');
            } finally {
              setSubmitting(false);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={s.container}>
      <View style={s.headerBox}>
        <Text style={s.headerTitle}>ออกบิลรายเดือน</Text>
        <Text style={s.headerSubTitle}>
          {selectedSlotId ? `ล็อก: ${selectedSlotNumber}` : 'เลือกล็อกเพื่อดำเนินการ'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={s.content}>

        {/* Stall Selection (Shows only if we need to select) */}
        {!params.slot_id && (
          <View style={s.section}>
            <Text style={s.sectionLabel}> เลือกล็อก</Text>
            <TouchableOpacity style={s.monthSelector} onPress={() => setShowStallPicker(true)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialIcons name="storefront" size={20} color="#6B7280" />
                <Text style={s.monthSelectorValue}>
                  {selectedSlotNumber ? `ล็อก ${selectedSlotNumber}` : 'กรุณาเลือกล็อก'}
                </Text>
              </View>
              <Text style={s.monthSelectorArrow}>เลือก ▼</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Month Picker Selection */}
        <View style={s.section}>
          <Text style={s.sectionLabel}> รอบบิล</Text>
          <TouchableOpacity style={s.monthSelector} onPress={() => setShowMonthPicker(true)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={s.monthSelectorIcon}></Text>
              <Text style={s.monthSelectorValue}>{billingMonth.label}</Text>
            </View>
            <Text style={s.monthSelectorArrow}>เปลี่ยน ▼</Text>
          </TouchableOpacity>
        </View>

        {/* Loading State or Result */}
        {loading ? (
          <LoadingSpinner />
        ) : billData ? (
          <>
            {/* Breakdown box */}
            <View style={s.receiptCard}>
              <View style={s.receiptHeader}>
                <Text style={s.receiptTitle}>รายละเอียดการเรียกเก็บ</Text>
                <Text style={s.receiptSub}>ประจำเดือน {billingMonth.label}</Text>
              </View>

              <View style={s.receiptBody}>
                {/* Rent */}
                <View style={s.row}>
                  <Text style={s.itemLabel}>ค่าเช่าพื้นที่</Text>
                  <Text style={s.itemValue}>฿{Number(billData.amounts.rent).toLocaleString()}</Text>
                </View>

                {/* Water */}
                <View style={s.rowWithSub}>
                  <View style={s.rowMain}>
                    <Text style={s.itemLabel}>ค่าน้ำประปา</Text>
                    <Text style={s.itemValue}>฿{Number(billData.amounts.water).toLocaleString()}</Text>
                  </View>
                  <Text style={s.itemDetail}>
                    (ใช้ {billData.units.water} หน่วย x {billData.rates.water} บ.)
                  </Text>
                </View>

                {/* Elec */}
                <View style={s.rowWithSub}>
                  <View style={s.rowMain}>
                    <Text style={s.itemLabel}>ค่าไฟฟ้า</Text>
                    <Text style={s.itemValue}>฿{Number(billData.amounts.electric).toLocaleString()}</Text>
                  </View>
                  <Text style={s.itemDetail}>
                    (ใช้ {billData.units.electric} หน่วย x {billData.rates.electric} บ.)
                  </Text>
                </View>

                {/* Grease Trap */}
                {billData.amounts.greaseTrapFee > 0 && (
                  <View style={s.row}>
                    <Text style={s.itemLabel}>ค่าดักไขมัน</Text>
                    <Text style={s.itemValue}>฿{Number(billData.amounts.greaseTrapFee).toLocaleString()}</Text>
                  </View>
                )}

                <View style={s.divider} />

                <View style={s.rowTotal}>
                  <Text style={s.totalLabel}>รวมสุทธิ</Text>
                  <Text style={s.totalValue}>฿{Number(billData.amounts.total).toLocaleString()}</Text>
                </View>
              </View>
            </View>

            {/* Config before submt */}
            <View style={s.section}>
              <Text style={s.sectionLabel}>กำหนดวันครบกำหนดชำระ</Text>
              <Text style={s.hint}>รูปแบบ: YYYY-MM-DD เช่น 2026-06-10</Text>
              <TextInput
                style={s.input}
                value={dueDateStr}
                onChangeText={setDueDateStr}
                placeholder="YYYY-MM-DD"
              />
            </View>

            <TouchableOpacity
              style={[s.submitBtn, submitting && s.submitBtnDisabled]}
              onPress={handleCreateBill}
              disabled={submitting}
            >
              <Text style={s.submitText}>{submitting ? 'กำลังสร้าง...' : '✅ ยืนยันออกบิลรายเดือน'}</Text>
            </TouchableOpacity>

          </>
        ) : (
          <View style={s.emptyState}>
            <Text style={s.emptyText}>ไม่สามารถออกบิลได้</Text>
            <Text style={s.emptySub}>กรุณาเลือกล็อก หรือ ตรวจสอบว่าได้บันทึกมิเตอร์ของล็อกนี้แล้ว</Text>
          </View>
        )}
      </ScrollView>

      {/* Stall Picker Modal */}
      <Modal visible={showStallPicker} transparent animationType="slide" onRequestClose={() => setShowStallPicker(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowStallPicker(false)}>
          <View style={[s.modalSheet, { maxHeight: '80%' }]}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>เลือกล็อกที่ต้องการออกบิล</Text>
            <ScrollView style={{ marginTop: 10 }}>
              {stalls.map((stall) => {
                const isSelected = stall.slot_id.toString() === selectedSlotId;
                return (
                  <TouchableOpacity
                    key={stall.slot_id}
                    style={[s.monthOption, isSelected && s.monthOptionActive]}
                    onPress={() => { 
                      setSelectedSlotId(stall.slot_id.toString());
                      setSelectedSlotNumber(stall.slot_number);
                      setShowStallPicker(false); 
                    }}
                  >
                    <Text style={[s.monthOptionText, isSelected && s.monthOptionTextActive]}>
                      ล็อก {stall.slot_number} - {stall.rental_contracts?.[0]?.tenant?.first_name || 'ไม่ทราบชื่อ'}
                    </Text>
                    {isSelected && <Text style={s.monthOptionCheck}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
              {stalls.length === 0 && (
                <Text style={{ textAlign: 'center', color: '#9CA3AF', marginTop: 20 }}>ไม่มีล็อกที่มีผู้เช่า</Text>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Month Picker Modal */}
      <Modal visible={showMonthPicker} transparent animationType="slide" onRequestClose={() => setShowMonthPicker(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowMonthPicker(false)}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>เลือกรอบบิล</Text>
            {BILLING_MONTHS.map((m, i) => {
              const isSelected = m.key === billingMonth.key;
              return (
                <TouchableOpacity
                  key={m.key}
                  style={[s.monthOption, isSelected && s.monthOptionActive]}
                  onPress={() => { setBillingMonth(m); setShowMonthPicker(false); }}
                >
                  <Text style={[s.monthOptionText, isSelected && s.monthOptionTextActive]}>
                    {m.label} {i === 1 && '(เดือนนี้)'}
                  </Text>
                  {isSelected && <Text style={s.monthOptionCheck}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#DC2626', fontSize: 16 },

  headerBox: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#80639A' },
  headerSubTitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },

  content: { padding: 16, paddingBottom: 40 },

  section: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  hint: { fontSize: 12, color: '#9CA3AF', marginBottom: 8 },

  input: {
    borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 10,
    padding: 12, fontSize: 15, backgroundColor: '#F9FAFB',
    color: '#1F2937'
  },

  monthSelector: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#F3E8FF', borderRadius: 12, padding: 14,
    borderWidth: 1.5, borderColor: '#A855F7',
  },
  monthSelectorIcon: { fontSize: 18 },
  monthSelectorValue: { fontSize: 15, fontWeight: '700', color: '#7E22CE' },
  monthSelectorArrow: { color: '#9333EA', fontSize: 13, fontWeight: '600' },

  receiptCard: {
    backgroundColor: '#fff', borderRadius: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 3, overflow: 'hidden'
  },
  receiptHeader: {
    backgroundColor: '#80639A', padding: 16, alignItems: 'center'
  },
  receiptTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  receiptSub: { color: '#E9D5FF', fontSize: 13, marginTop: 4 },
  receiptBody: { padding: 16 },

  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' },
  rowWithSub: { marginBottom: 12 },
  rowMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemLabel: { fontSize: 15, color: '#4B5563', fontWeight: '500' },
  itemValue: { fontSize: 15, color: '#1F2937', fontWeight: '600' },
  itemDetail: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },

  divider: { height: 1.5, backgroundColor: '#E5E7EB', marginVertical: 12, borderStyle: 'dotted' },

  rowTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  totalLabel: { fontSize: 16, color: '#1F2937', fontWeight: '800' },
  totalValue: { fontSize: 20, color: '#DC2626', fontWeight: '800' },

  submitBtn: {
    backgroundColor: '#16A34A', padding: 16, borderRadius: 12, alignItems: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  emptyState: { padding: 32, alignItems: 'center', backgroundColor: '#fff', borderRadius: 14 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 4 },
  emptySub: { fontSize: 13, color: '#6B7280', textAlign: 'center' },

  /* modal */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 36,
  },
  modalHandle: { width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1F2937', marginBottom: 16 },
  monthOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12,
    marginBottom: 6, backgroundColor: '#F9FAFB',
  },
  monthOptionActive: { backgroundColor: '#F3E8FF', },
  monthOptionText: { fontSize: 15, color: '#374151', fontWeight: '500' },
  monthOptionTextActive: { color: '#7E22CE', fontWeight: '700' },
  monthOptionCheck: { color: '#7E22CE', fontSize: 18, fontWeight: '700' },
});
