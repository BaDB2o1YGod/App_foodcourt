import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert } from 'react-native';
import { settingsAPI } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function AdminSettings() {
  const [waterRate, setWaterRate] = useState('');
  const [electricRate, setElectricRate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await settingsAPI.getUtilityRates();
        const rates = res.data.data || {};
        setWaterRate(String(rates.water_rate || ''));
        setElectricRate(String(rates.electricity_rate || ''));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const handleSave = async () => {
    if (!waterRate || !electricRate) { Alert.alert('แจ้งเตือน', 'กรุณากรอกราคาให้ครบ'); return; }
    setSaving(true);
    try {
      await settingsAPI.updateUtilityRates({
        water_rate: parseFloat(waterRate),
        electricity_rate: parseFloat(electricRate),
      });
      Alert.alert('สำเร็จ', 'บันทึกการตั้งค่าเรียบร้อย');
    } catch (e: any) {
      Alert.alert('ผิดพลาด', e?.response?.data?.message || 'ไม่สามารถบันทึกได้');
    } finally { setSaving(false); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Text style={styles.cardTitle}>⚡ อัตราค่าน้ำ-ไฟ</Text>
        <View style={styles.field}>
          <Text style={styles.label}>ค่าน้ำประปา (฿/หน่วย)</Text>
          <TextInput
            style={styles.input}
            value={waterRate}
            onChangeText={setWaterRate}
            keyboardType="numeric"
            placeholder="0.00"
            placeholderTextColor="#9CA3AF"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>ค่าไฟฟ้า (฿/หน่วย)</Text>
          <TextInput
            style={styles.input}
            value={electricRate}
            onChangeText={setElectricRate}
            keyboardType="numeric"
            placeholder="0.00"
            placeholderTextColor="#9CA3AF"
          />
        </View>
        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveTxt}>{saving ? 'กำลังบันทึก...' : '💾 บันทึกการตั้งค่า'}</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, { marginTop: 8 }]}>
        <Text style={styles.cardTitle}>ℹ️ ข้อมูลระบบ</Text>
        <View style={styles.infoRow}><Text style={styles.infoLabel}>ระบบ</Text><Text style={styles.infoValue}>BRU Food Court Management</Text></View>
        <View style={styles.infoRow}><Text style={styles.infoLabel}>Backend</Text><Text style={styles.infoValue}>192.168.1.126:3000</Text></View>
        <View style={styles.infoRow}><Text style={styles.infoLabel}>รุ่น</Text><Text style={styles.infoValue}>v1.0.0</Text></View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6', padding: 16 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 16 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 10, padding: 12, fontSize: 14, color: '#1F2937',
  },
  saveBtn: { backgroundColor: '#DC2626', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 4 },
  saveTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  infoRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  infoLabel: { width: 80, color: '#9CA3AF', fontSize: 13 },
  infoValue: { flex: 1, color: '#374151', fontSize: 13, fontWeight: '500' },
});
