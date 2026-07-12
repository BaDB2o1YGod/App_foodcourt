import { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { stallsAPI } from '../../services/api';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

/* ─── generate selectable billing months ────────────────
   Rule: current month up to 6 months ahead (never past)
   Billing date is the 28th of each month.
──────────────────────────────────────────────────────── */
const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

function generateBillingMonths(count = 6) {
  const result: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const y = d.getFullYear();
    const m = d.getMonth(); // 0-indexed
    const key = `${y}-${String(m + 1).padStart(2, '0')}`; // "2026-05"
    const label = `${THAI_MONTHS[m]} ${y + 543} (28 ${THAI_MONTHS[m]})`; // "พ.ค. 2569 (28 พ.ค.)"
    result.push({ key, label });
  }
  return result;
}

const BILLING_MONTHS = generateBillingMonths(6);

/* ════════════════════════════════════════════════════════ */
export default function MeterRecording() {
  const [stalls, setStalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [waterReading, setWaterReading] = useState('');
  const [electricReading, setElectricReading] = useState('');
  const [billingMonth, setBillingMonth] = useState(BILLING_MONTHS[0]); // default = current month
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [prevWater, setPrevWater] = useState<number | null>(null);
  const [prevElectric, setPrevElectric] = useState<number | null>(null);
  const [loadingPrev, setLoadingPrev] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [selectedFC, setSelectedFC] = useState<number>(1);
  const [showFCPicker, setShowFCPicker] = useState(false);
  const [showStallPicker, setShowStallPicker] = useState(false);

  const FOOD_COURTS = [
    { id: 1, label: 'ศูนย์อาหาร 1' },
    { id: 2, label: 'ศูนย์อาหาร 2' }
  ];

  /* clear selected stall when FC changes */
  useEffect(() => {
    setSelected(null);
  }, [selectedFC]);

  /* fetch all occupied stalls on mount */
  useEffect(() => {
    (async () => {
      try {
        const res = await stallsAPI.getAll({ status: 'OCCUPIED' });
        const data = res.data.data || [];
        data.sort((a: any, b: any) => a.slot_number.localeCompare(b.slot_number, undefined, { numeric: true, sensitivity: 'base' }));
        setStalls(data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  /* fetch latest meter readings when stall changes */
  useEffect(() => {
    if (!selected) { setPrevWater(null); setPrevElectric(null); return; }
    setLoadingPrev(true);
    stallsAPI.getMeterReadings(selected.slot_id)
      .then((res) => {
        const readings: any[] = res.data.data || [];
        const lastWater = readings.find(r => r.meter_type === 'WATER');
        const lastElectric = readings.find(r => r.meter_type === 'ELECTRICITY');
        setPrevWater(lastWater ? lastWater.current_reading : null);
        setPrevElectric(lastElectric ? lastElectric.current_reading : null);
      })
      .catch(() => { setPrevWater(null); setPrevElectric(null); })
      .finally(() => setLoadingPrev(false));
  }, [selected?.slot_id]);

  /* submit */
  const handleRecord = async () => {
    if (!selected) { Alert.alert('แจ้งเตือน', 'กรุณาเลือกล็อก'); return; }
    if (!waterReading && !electricReading) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกค่ามิเตอร์น้ำ หรือมิเตอร์ไฟ อย่างน้อยหนึ่งรายการ'); return;
    }
    setSubmitting(true);
    try {
      await stallsAPI.recordMeterReading(selected.slot_id, {
        waterMeter: waterReading || undefined,
        electricMeter: electricReading || undefined,
        billing_month: billingMonth.key,
      });
      Alert.alert('✅ สำเร็จ', `บันทึกมิเตอร์สำหรับบิล ${billingMonth.label} เรียบร้อยแล้ว`, [
        { text: 'อยู่หน้านี้', style: 'cancel' },
        {
          text: 'ออกบิลรายเดือน →',
          onPress: () =>
            router.push({
              pathname: '/(admin)/monthly-billing',
              params: { slot_id: selected.slot_id, slot_number: selected.slot_number },
            }),
        },
      ]);
      setWaterReading('');
      setElectricReading('');
    } catch (e: any) {
      Alert.alert('ผิดพลาด', e?.response?.data?.message || 'ไม่สามารถบันทึกได้');
    } finally { setSubmitting(false); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <>
      <ScrollView style={s.container} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

        {/* ── Billing Month Picker ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>เดือนที่ออกบิล</Text>
          <Text style={s.hint}>บันทึกมิเตอร์จะใช้สำหรับบิลวันที่ 28 ของเดือนที่เลือก</Text>
          <TouchableOpacity style={s.monthSelector} onPress={() => setShowMonthPicker(true)}>
            <View style={s.monthSelectorLeft}>
              <MaterialIcons name="calendar-today" size={20} color="#6B7280" style={{ marginRight: 8 }} />
              <Text style={s.monthSelectorValue}>{billingMonth.label}</Text>
            </View>
            <Text style={s.monthSelectorArrow}>▼</Text>
          </TouchableOpacity>
        </View>

        {/* ── Stall Selector ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>ศูนย์อาหาร</Text>
          <TouchableOpacity style={s.monthSelector} onPress={() => setShowFCPicker(true)}>
            <View style={s.monthSelectorLeft}>
              <MaterialIcons name="storefront" size={20} color="#6B7280" style={{ marginRight: 8 }} />
              <Text style={s.monthSelectorValue}>{FOOD_COURTS.find(f => f.id === selectedFC)?.label}</Text>
            </View>
            <Text style={s.monthSelectorArrow}>▼</Text>
          </TouchableOpacity>

          <Text style={[s.sectionTitle, { marginTop: 16 }]}>เลือกล็อก</Text>
          <TouchableOpacity style={s.monthSelector} onPress={() => setShowStallPicker(true)}>
            <View style={s.monthSelectorLeft}>
              <MaterialIcons name="store" size={20} color="#6B7280" style={{ marginRight: 8 }} />
              <Text style={s.monthSelectorValue}>
                {selected ? `ล็อก ${selected.slot_number} - ${selected.rental_contracts?.[0]?.tenant?.first_name ?? ''}` : 'กรุณาเลือกล็อก'}
              </Text>
            </View>
            <Text style={s.monthSelectorArrow}>▼</Text>
          </TouchableOpacity>
        </View>

        {/* ── Meter Inputs ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>บันทึกค่ามิเตอร์</Text>
          <Text style={s.hint}>กรอกเลขที่อ่านได้จากหน้าปัดมิเตอร์จริง · ระบบจะคำนวณหน่วยที่ใช้ให้อัตโนมัติ</Text>

          {/* ── Water ── */}
          <View style={s.meterCard}>
            <View style={s.meterHeader}>
              <Text style={s.meterIcon}>💧</Text>
              <View>
                <Text style={s.meterTitle}>มิเตอร์น้ำประปา</Text>
                <Text style={s.meterSubtitle}>7 หลัก · หน่วย: ลูกบาศก์เมตร (ม³)</Text>
              </View>
            </View>

            {/* Prev reading chip */}
            <View style={s.prevRow}>
              <Text style={s.prevLabel}>📌 เลขมิเตอร์ครั้งก่อน:</Text>
              <Text style={s.prevValue}>
                {loadingPrev
                  ? 'กำลังโหลด...'
                  : prevWater !== null
                    ? String(Math.round(prevWater)).padStart(7, '0')
                    : 'ยังไม่มีข้อมูล'}
              </Text>
            </View>

            {/* Digit display */}
            {waterReading.length > 0 && (
              <View style={s.dialRow}>
                {String(waterReading).padStart(7, '0').slice(-7).split('').map((d, i) => (
                  <View key={i} style={[s.dialBox, i >= 5 && s.dialBoxDecimal]}>
                    <Text style={[s.dialDigit, i >= 5 && s.dialDigitDecimal]}>{d}</Text>
                  </View>
                ))}
              </View>
            )}

            <TextInput
              style={s.meterInput}
              placeholder="0000000  (7 หลัก)"
              placeholderTextColor="#9CA3AF"
              value={waterReading}
              onChangeText={(v) => setWaterReading(v.replace(/[^0-9]/g, '').slice(0, 7))}
              keyboardType="numeric"
              maxLength={7}
            />

            {waterReading && prevWater !== null && (
              <View style={s.usageRow}>
                <Text style={s.usageLabel}>หน่วยที่ใช้ในรอบนี้</Text>
                <Text style={s.usageVal}>
                  {Math.max(0, parseInt(waterReading || '0') - prevWater).toLocaleString()} ม³
                </Text>
              </View>
            )}
          </View>

          {/* ── Electricity ── */}
          <View style={[s.meterCard, s.meterCardElectric]}>
            <View style={s.meterHeader}>
              <Text style={s.meterIcon}>⚡</Text>
              <View>
                <Text style={s.meterTitle}>มิเตอร์ไฟฟ้า</Text>
                <Text style={[s.meterSubtitle, { color: '#92400E' }]}>5 หลัก · หน่วย: กิโลวัตต์-ชั่วโมง (kWh)</Text>
              </View>
            </View>

            {/* Prev reading chip */}
            <View style={[s.prevRow, s.prevRowElectric]}>
              <Text style={[s.prevLabel, { color: '#92400E' }]}>📌 เลขมิเตอร์ครั้งก่อน:</Text>
              <Text style={[s.prevValue, { color: '#78350F' }]}>
                {loadingPrev
                  ? 'กำลังโหลด...'
                  : prevElectric !== null
                    ? String(Math.round(prevElectric)).padStart(5, '0')
                    : 'ยังไม่มีข้อมูล'}
              </Text>
            </View>

            {/* Digit display */}
            {electricReading.length > 0 && (
              <View style={s.dialRow}>
                {String(electricReading).padStart(5, '0').slice(-5).split('').map((d, i) => (
                  <View key={i} style={[s.dialBox, s.dialBoxElectric]}>
                    <Text style={s.dialDigit}>{d}</Text>
                  </View>
                ))}
              </View>
            )}

            <TextInput
              style={[s.meterInput, { borderColor: '#FDE68A' }]}
              placeholder="00000  (5 หลัก)"
              placeholderTextColor="#9CA3AF"
              value={electricReading}
              onChangeText={(v) => setElectricReading(v.replace(/[^0-9]/g, '').slice(0, 5))}
              keyboardType="numeric"
              maxLength={5}
            />

            {electricReading && prevElectric !== null && (
              <View style={[s.usageRow, s.usageRowElectric]}>
                <Text style={[s.usageLabel, { color: '#92400E' }]}>หน่วยที่ใช้ในรอบนี้</Text>
                <Text style={[s.usageVal, { color: '#78350F' }]}>
                  {Math.max(0, parseInt(electricReading || '0') - prevElectric).toLocaleString()} kWh
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Summary box ── */}
        {(waterReading || electricReading) && selected && (
          <View style={s.summaryBox}>
            <Text style={s.summaryTitle}>สรุปการบันทึก</Text>
            <Text style={s.summaryRow}>📅 บิลเดือน: <Text style={s.summaryVal}>{billingMonth.label}</Text></Text>
            <Text style={s.summaryRow}>🏪 ล็อก: <Text style={s.summaryVal}>{selected.slot_number}</Text></Text>
            {waterReading && (
              <>
                <Text style={s.summaryRow}>💧 เลขมิเตอร์น้ำ: <Text style={s.summaryVal}>{String(waterReading).padStart(7, '0')}</Text></Text>
                {prevWater !== null && (
                  <Text style={s.summaryRow}>   ↳ ใช้ไป: <Text style={s.summaryVal}>{Math.max(0, parseInt(waterReading) - prevWater).toLocaleString()} ม³</Text></Text>
                )}
              </>
            )}
            {electricReading && (
              <>
                <Text style={s.summaryRow}>⚡ เลขมิเตอร์ไฟ: <Text style={s.summaryVal}>{String(electricReading).padStart(5, '0')}</Text></Text>
                {prevElectric !== null && (
                  <Text style={s.summaryRow}>   ↳ ใช้ไป: <Text style={s.summaryVal}>{Math.max(0, parseInt(electricReading) - prevElectric).toLocaleString()} kWh</Text></Text>
                )}
              </>
            )}
          </View>
        )}

        {/* ── Submit ── */}
        <TouchableOpacity
          style={[s.submitBtn, submitting && { opacity: 0.6 }]}
          onPress={handleRecord}
          disabled={submitting}
        >
          <Text style={s.submitText}>{submitting ? 'กำลังบันทึก...' : 'บันทึกมิเตอร์'}</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* ── Month Picker Modal ── */}
      <Modal visible={showMonthPicker} transparent animationType="slide" onRequestClose={() => setShowMonthPicker(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowMonthPicker(false)}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>เลือกเดือนออกบิล</Text>
            <Text style={s.modalSubtitle}>บิลออกทุกวันที่ 28 ของเดือน · เลือกได้เฉพาะเดือนปัจจุบันและเดือนถัดไป</Text>

            {BILLING_MONTHS.map((m, i) => {
              const isSelected = m.key === billingMonth.key;
              return (
                <TouchableOpacity
                  key={m.key}
                  style={[s.monthOption, isSelected && s.monthOptionActive]}
                  onPress={() => { setBillingMonth(m); setShowMonthPicker(false); }}
                >
                  <View style={s.monthOptionLeft}>
                    <Text style={[s.monthOptionText, isSelected && s.monthOptionTextActive]}>
                      {m.label}
                    </Text>
                    {i === 0 && <View style={s.currentBadge}><Text style={s.currentBadgeText}>เดือนนี้</Text></View>}
                  </View>
                  {isSelected && <Text style={s.monthOptionCheck}>✓</Text>}
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity style={s.modalClose} onPress={() => setShowMonthPicker(false)}>
              <Text style={s.modalCloseText}>ปิด</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── FC Picker Modal ── */}
      <Modal visible={showFCPicker} transparent animationType="slide" onRequestClose={() => setShowFCPicker(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowFCPicker(false)}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>เลือกศูนย์อาหาร</Text>
            
            {FOOD_COURTS.map((fc) => {
              const isSelected = fc.id === selectedFC;
              return (
                <TouchableOpacity
                  key={fc.id}
                  style={[s.monthOption, isSelected && s.monthOptionActive]}
                  onPress={() => { setSelectedFC(fc.id); setShowFCPicker(false); }}
                >
                  <View style={s.monthOptionLeft}>
                    <Text style={[s.monthOptionText, isSelected && s.monthOptionTextActive]}>
                      {fc.label}
                    </Text>
                  </View>
                  {isSelected && <Text style={s.monthOptionCheck}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Stall Picker Modal ── */}
      <Modal visible={showStallPicker} transparent animationType="slide" onRequestClose={() => setShowStallPicker(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowStallPicker(false)}>
          <View style={[s.modalSheet, { maxHeight: '80%' }]}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>เลือกล็อก (ศูนย์อาหาร {selectedFC})</Text>
            
            <ScrollView style={{ marginTop: 8 }}>
              {stalls.filter(s => s.food_court_id === selectedFC).map((stall) => {
                const isSelected = selected?.slot_id === stall.slot_id;
                const tenantName = stall.rental_contracts?.[0]?.tenant ? `${stall.rental_contracts[0].tenant.first_name} ${stall.rental_contracts[0].tenant.last_name ?? ''}` : 'ว่าง';
                return (
                  <TouchableOpacity
                    key={stall.slot_id}
                    style={[s.monthOption, isSelected && s.monthOptionActive]}
                    onPress={() => { setSelected(stall); setShowStallPicker(false); }}
                  >
                    <View style={s.monthOptionLeft}>
                      <Text style={[s.monthOptionText, isSelected && s.monthOptionTextActive]}>
                        ล็อก {stall.slot_number}
                      </Text>
                      <Text style={{ fontSize: 13, color: '#6B7280', marginLeft: 8 }}>
                        — {tenantName}
                      </Text>
                    </View>
                    {isSelected && <Text style={s.monthOptionCheck}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
              {stalls.filter(s => s.food_court_id === selectedFC).length === 0 && (
                <Text style={{ textAlign: 'center', color: '#9CA3AF', padding: 20 }}>ไม่มีล็อกที่มีผู้เช่าในศูนย์อาหารนี้</Text>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

/* ─── styles ──────────────────────────────────────────── */
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  content: { padding: 16, paddingBottom: 40 },

  section: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  hint: { fontSize: 12, color: '#9CA3AF', marginBottom: 12 },

  /* month selector */
  monthSelector: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#F5F3FF', borderRadius: 12, padding: 14,
    borderWidth: 1.5, borderColor: '#7C3AED',
  },
  monthSelectorLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  monthSelectorIcon: { fontSize: 18 },
  monthSelectorValue: { fontSize: 15, fontWeight: '600', color: '#5B21B6' },
  monthSelectorArrow: { color: '#7C3AED', fontSize: 12 },

  /* stall chips */
  stallChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB',
    alignItems: 'center',
  },
  stallChipActive: { borderColor: '#DC2626', backgroundColor: '#FEF2F2' },
  stallChipText: { color: '#6B7280', fontSize: 13, fontWeight: '600' },
  stallChipActiveText: { color: '#DC2626' },
  stallChipSub: { color: '#9CA3AF', fontSize: 11, marginTop: 2 },
  stallChipSubActive: { color: '#DC2626', opacity: 0.7 },
  selectedInfo: { marginTop: 10, backgroundColor: '#FFF7ED', borderRadius: 8, padding: 8 },
  selectedInfoText: { color: '#92400E', fontSize: 13, fontWeight: '500' },

  /* meter cards */
  meterCard: {
    borderRadius: 12, borderWidth: 1.5, borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF', padding: 14, marginBottom: 10,
  },
  meterCardElectric: { borderColor: '#FDE68A', backgroundColor: '#FFFBEB' },
  meterHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  meterIcon: { fontSize: 22 },
  meterTitle: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  meterSubtitle: { fontSize: 11, color: '#1D4ED8', marginTop: 1 },

  /* dial digit display */
  dialRow: { flexDirection: 'row', gap: 4, justifyContent: 'center', marginBottom: 10 },
  dialBox: {
    width: 34, height: 42, backgroundColor: '#1E3A8A', borderRadius: 6,
    justifyContent: 'center', alignItems: 'center',
  },
  dialBoxDecimal: { backgroundColor: '#DC2626' }, // last 2 digits = decimal on water meters
  dialBoxElectric: { backgroundColor: '#92400E' },
  dialDigit: { color: '#fff', fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
  dialDigitDecimal: { color: '#FCA5A5' },

  usageRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#DBEAFE', borderRadius: 8, padding: 8, marginTop: 6,
  },
  usageRowElectric: { backgroundColor: '#FEF9C3' },
  usageLabel: { fontSize: 12, color: '#1D4ED8', fontWeight: '600' },
  usageVal: { fontSize: 15, color: '#1E3A8A', fontWeight: '800' },
  prevRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#DBEAFE', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 8 },
  prevRowElectric: { backgroundColor: '#FEF9C3' },
  prevLabel: { fontSize: 12, color: '#1D4ED8', fontWeight: '600' },
  prevValue: { fontSize: 13, color: '#1E3A8A', fontWeight: '700' },
  usagePreview: { fontSize: 12, color: '#1D4ED8', marginTop: 6, textAlign: 'right', fontWeight: '600' },
  usagePreviewElectric: { color: '#92400E' },

  meterInput: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 15, color: '#1F2937',
  },

  /* summary */
  summaryBox: {
    backgroundColor: '#F0FDF4', borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: '#86EFAC', marginBottom: 14,
  },
  summaryTitle: { fontSize: 13, fontWeight: '700', color: '#166534', marginBottom: 8 },
  summaryRow: { fontSize: 13, color: '#374151', marginBottom: 4 },
  summaryVal: { fontWeight: '700', color: '#1F2937' },

  /* submit */
  submitBtn: { backgroundColor: '#DC2626', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 4 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  /* modal */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 36,
  },
  modalHandle: { width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1F2937', marginBottom: 4 },
  modalSubtitle: { fontSize: 12, color: '#9CA3AF', marginBottom: 16 },

  monthOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12,
    marginBottom: 6, backgroundColor: '#F9FAFB',
  },
  monthOptionActive: { backgroundColor: '#EDE9FE', },
  monthOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  monthOptionText: { fontSize: 15, color: '#374151', fontWeight: '500' },
  monthOptionTextActive: { color: '#7C3AED', fontWeight: '700' },
  monthOptionCheck: { color: '#7C3AED', fontSize: 18, fontWeight: '700' },

  currentBadge: { backgroundColor: '#DCFCE7', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  currentBadgeText: { fontSize: 10, color: '#166534', fontWeight: '600' },

  modalClose: { marginTop: 8, backgroundColor: '#F3F4F6', borderRadius: 12, padding: 14, alignItems: 'center' },
  modalCloseText: { fontSize: 15, color: '#374151', fontWeight: '600' },
});
