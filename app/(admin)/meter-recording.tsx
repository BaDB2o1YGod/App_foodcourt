import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert } from 'react-native';
import { stallsAPI } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function MeterRecording() {
  const [stalls, setStalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [type, setType] = useState<'WATER' | 'ELECTRICITY'>('ELECTRICITY');
  const [meterNum, setMeterNum] = useState('');
  const [prev, setPrev] = useState('');
  const [curr, setCurr] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await stallsAPI.getAll({ status: 'OCCUPIED' });
        setStalls(res.data.data || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const unitUsed = parseFloat(curr || '0') - parseFloat(prev || '0');
  const total = unitUsed > 0 ? unitUsed * parseFloat(unitPrice || '0') : 0;

  const handleRecord = async () => {
    if (!selected) { Alert.alert('แจ้งเตือน', 'กรุณาเลือกล็อก'); return; }
    if (!curr || !prev || !unitPrice) { Alert.alert('แจ้งเตือน', 'กรุณากรอกข้อมูลให้ครบ'); return; }
    setSubmitting(true);
    try {
      await stallsAPI.recordMeterReading(selected.slot_id, {
        meter_type: type,
        meter_number: meterNum,
        previous_reading: parseFloat(prev),
        current_reading: parseFloat(curr),
        unit_used: unitUsed,
        unit_price: parseFloat(unitPrice),
        total_cost: total,
      });
      Alert.alert('สำเร็จ', 'บันทึกมิเตอร์เรียบร้อย');
      setPrev(''); setCurr(''); setMeterNum('');
    } catch (e: any) {
      Alert.alert('ผิดพลาด', e?.response?.data?.message || 'ไม่สามารถบันทึกได้');
    } finally { setSubmitting(false); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* Type Selector */}
      <View style={styles.typeRow}>
        {(['ELECTRICITY', 'WATER'] as const).map((t) => (
          <TouchableOpacity key={t} style={[styles.typeBtn, type === t && styles.typeActive]} onPress={() => setType(t)}>
            <Text style={[styles.typeText, type === t && styles.typeTextActive]}>
              {t === 'ELECTRICITY' ? '⚡ ไฟฟ้า' : '💧 น้ำประปา'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stall Select */}
      <Text style={styles.label}>เลือกล็อก</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        {stalls.map((s) => (
          <TouchableOpacity key={s.slot_id} style={[styles.stallChip, selected?.slot_id === s.slot_id && styles.stallChipActive]} onPress={() => setSelected(s)}>
            <Text style={[styles.stallChipText, selected?.slot_id === s.slot_id && styles.stallChipActiveText]}>ล็อก {s.slot_number}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Fields */}
      <View style={styles.form}>
        <Field label="เลขมิเตอร์" value={meterNum} onChange={setMeterNum} placeholder="เลขมิเตอร์ (ถ้ามี)" />
        <Field label="ครั้งก่อน (หน่วย)" value={prev} onChange={setPrev} placeholder="0" keyboardType="numeric" />
        <Field label="ครั้งนี้ (หน่วย)" value={curr} onChange={setCurr} placeholder="0" keyboardType="numeric" />
        <Field label={`ราคา/หน่วย (฿)`} value={unitPrice} onChange={setUnitPrice} placeholder="0.00" keyboardType="numeric" />

        {/* Summary */}
        {unitUsed > 0 && (
          <View style={styles.summary}>
            <Text style={styles.summaryText}>หน่วยที่ใช้: {unitUsed.toFixed(2)} หน่วย</Text>
            <Text style={styles.sumaryTotal}>รวม: ฿{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
          </View>
        )}

        <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.6 }]} onPress={handleRecord} disabled={submitting}>
          <Text style={styles.submitText}>{submitting ? 'กำลังบันทึก...' : '💾 บันทึกมิเตอร์'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function Field({ label, value, onChange, placeholder, keyboardType }: any) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>{label}</Text>
      <TextInput
        style={{ backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, fontSize: 14, color: '#1F2937' }}
        value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#9CA3AF"
        keyboardType={keyboardType || 'default'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  typeRow: { flexDirection: 'row', margin: 16, gap: 12 },
  typeBtn: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 2, borderColor: '#E5E7EB', alignItems: 'center', backgroundColor: '#fff' },
  typeActive: { borderColor: '#DC2626', backgroundColor: '#FEF2F2' },
  typeText: { fontWeight: '600', color: '#6B7280' },
  typeTextActive: { color: '#DC2626' },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginHorizontal: 16, marginBottom: 8 },
  stallChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, borderWidth: 1.5,
    borderColor: '#E5E7EB', marginLeft: 12, backgroundColor: '#fff',
  },
  stallChipActive: { borderColor: '#DC2626', backgroundColor: '#FEF2F2' },
  stallChipText: { color: '#6B7280', fontSize: 13 },
  stallChipActiveText: { color: '#DC2626', fontWeight: '700' },
  form: { margin: 16, backgroundColor: '#fff', borderRadius: 16, padding: 16, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
  summary: { backgroundColor: '#EFF6FF', borderRadius: 10, padding: 12, marginBottom: 14 },
  summaryText: { color: '#1E40AF', fontSize: 13 },
  sumaryTotal: { color: '#1E40AF', fontWeight: '800', fontSize: 15, marginTop: 4 },
  submitBtn: { backgroundColor: '#DC2626', borderRadius: 10, padding: 14, alignItems: 'center' },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
