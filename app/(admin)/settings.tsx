import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert, Modal } from 'react-native';
import { settingsAPI, stallsAPI } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Ionicons } from '@expo/vector-icons';

export default function AdminSettings() {
  const [waterRate, setWaterRate] = useState('');
  const [electricRate, setElectricRate] = useState('');
  const [lateRentFine, setLateRentFine] = useState('');
  const [lateUtilityFine, setLateUtilityFine] = useState('');
  const [dueDayOfMonth, setDueDayOfMonth] = useState('10');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditingUtility, setIsEditingUtility] = useState(false);
  const [isEditingFine, setIsEditingFine] = useState(false);

  // Stall Settings State
  const [allStalls, setAllStalls] = useState<any[]>([]);
  const [selectedFoodCourt, setSelectedFoodCourt] = useState<number | null>(null);
  const [selectedStall, setSelectedStall] = useState<any>(null);
  const [stallSizeInput, setStallSizeInput] = useState('');
  const [isEditingSize, setIsEditingSize] = useState(false);
  const [savingSize, setSavingSize] = useState(false);
  
  // Modals
  const [showFcModal, setShowFcModal] = useState(false);
  const [showStallModal, setShowStallModal] = useState(false);

  const fetchData = async () => {
    try {
      const [resRates, resStalls] = await Promise.all([
        settingsAPI.getUtilityRates(),
        stallsAPI.getAll()
      ]);
      const rates = resRates.data.data || {};
      setWaterRate(String(rates.waterRatePerUnit || ''));
      setElectricRate(String(rates.electricRatePerUnit || ''));
      setLateRentFine(String(rates.lateRentFine || '100'));
      setLateUtilityFine(String(rates.lateUtilityFine || '50'));
      setDueDayOfMonth(String(rates.dueDayOfMonth || rates.paymentDueDays || '10'));

      // Clean deduplicate stall list by slot_number
      const rawStalls = resStalls.data.data || [];
      const map = new Map<string, any>();
      for (const s of rawStalls) {
        if (!map.has(s.slot_number)) {
          map.set(s.slot_number, s);
        }
      }
      setAllStalls(Array.from(map.values()));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSaveUtilityRates = async () => {
    if (!waterRate || !electricRate) { Alert.alert('แจ้งเตือน', 'กรุณากรอกราคาให้ครบ'); return; }
    setSaving(true);
    try {
      await settingsAPI.updateUtilityRates({
        waterRatePerUnit: parseFloat(waterRate),
        electricRatePerUnit: parseFloat(electricRate),
        lateRentFine: parseFloat(lateRentFine),
        lateUtilityFine: parseFloat(lateUtilityFine),
        dueDayOfMonth: parseInt(dueDayOfMonth, 10) || 10,
      });
      Alert.alert('สำเร็จ', 'บันทึกอัตราค่าน้ำ-ไฟเรียบร้อย');
      setIsEditingUtility(false);
    } catch (e: any) {
      Alert.alert('ผิดพลาด', e?.response?.data?.message || 'ไม่สามารถบันทึกได้');
    } finally { setSaving(false); }
  };

  const handleSaveFineRates = async () => {
    if (!dueDayOfMonth || !lateRentFine || !lateUtilityFine) { Alert.alert('แจ้งเตือน', 'กรุณากรอกข้อมูลให้ครบ'); return; }
    setSaving(true);
    try {
      await settingsAPI.updateUtilityRates({
        waterRatePerUnit: parseFloat(waterRate),
        electricRatePerUnit: parseFloat(electricRate),
        lateRentFine: parseFloat(lateRentFine),
        lateUtilityFine: parseFloat(lateUtilityFine),
        dueDayOfMonth: parseInt(dueDayOfMonth, 10) || 10,
      });
      Alert.alert('สำเร็จ', 'บันทึกกำหนดวันชำระและค่าปรับเรียบร้อย');
      setIsEditingFine(false);
    } catch (e: any) {
      Alert.alert('ผิดพลาด', e?.response?.data?.message || 'ไม่สามารถบันทึกได้');
    } finally { setSaving(false); }
  };

  // derived data for dropdowns
  const availableStalls = allStalls.filter((s) => s.food_court_id === selectedFoodCourt);

  // When a stall is picked
  const handleSelectStall = (s: any) => {
    setSelectedStall(s);
    setStallSizeInput(s.slot_size || '');
    setIsEditingSize(false);
    setShowStallModal(false);
  };

  // When food court is picked
  const handleSelectFC = (fc_id: number) => {
    setSelectedFoodCourt(fc_id);
    setSelectedStall(null);
    setStallSizeInput('');
    setIsEditingSize(false);
    setShowFcModal(false);
  };

  const handleSaveSize = async () => {
    if (!selectedStall) return;
    setSavingSize(true);
    try {
      await stallsAPI.update(selectedStall.slot_id, { slot_size: stallSizeInput });
      Alert.alert('สำเร็จ', 'อัปเดตขนาดล็อคเรียบร้อยแล้ว');
      setIsEditingSize(false);
      // update local
      const updatedStalls = allStalls.map(s => s.slot_id === selectedStall.slot_id ? { ...s, slot_size: stallSizeInput } : s);
      setAllStalls(updatedStalls);
      setSelectedStall({ ...selectedStall, slot_size: stallSizeInput });
    } catch (e: any) {
      Alert.alert('ผิดพลาด', e?.response?.data?.message || 'อัปเดตไม่ได้');
    } finally {
      setSavingSize(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <View style={styles.container}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* Utility Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>⚡ อัตราค่าน้ำ-ไฟ</Text>
          <View style={styles.field}>
            <Text style={styles.label}>ค่าน้ำประปา (฿/หน่วย)</Text>
            <TextInput
              style={[styles.input, !isEditingUtility && styles.inputDisabled]}
              value={waterRate}
              onChangeText={setWaterRate}
              keyboardType="numeric"
              editable={isEditingUtility}
              placeholder="0.00"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>ค่าไฟฟ้า (฿/หน่วย)</Text>
            <TextInput
              style={[styles.input, !isEditingUtility && styles.inputDisabled]}
              value={electricRate}
              onChangeText={setElectricRate}
              keyboardType="numeric"
              editable={isEditingUtility}
              placeholder="0.00"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          {!isEditingUtility ? (
            <TouchableOpacity style={styles.editBtn} onPress={() => setIsEditingUtility(true)}>
              <Text style={styles.editBtnTxt}>แก้ไข</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.confirmBtn, saving && { opacity: 0.6 }]} onPress={handleSaveUtilityRates} disabled={saving}>
              <Text style={styles.confirmBtnTxt}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Late Fine & Due Days Card */}
        <View style={[styles.card, { marginTop: 12 }]}>
          <Text style={styles.cardTitle}>⚠️ กำหนดวันชำระและค่าปรับ</Text>
          <View style={styles.field}>
            <Text style={styles.label}>กำหนดชำระทุกวันที่ / ภายใน (วัน)</Text>
            <TextInput
              style={[styles.input, !isEditingFine && styles.inputDisabled]}
              value={dueDayOfMonth}
              onChangeText={setDueDayOfMonth}
              keyboardType="numeric"
              editable={isEditingFine}
              placeholder="10"
              placeholderTextColor="#9CA3AF"
            />
            <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
              กำหนดให้ชำระได้ตั้งแต่วันที่ 1 ถึงวันที่ {dueDayOfMonth || '10'} ของเดือน
            </Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>ค่าปรับจ่ายค่าเช่าล่าช้า (฿/วัน)</Text>
            <TextInput
              style={[styles.input, !isEditingFine && styles.inputDisabled]}
              value={lateRentFine}
              onChangeText={setLateRentFine}
              keyboardType="numeric"
              editable={isEditingFine}
              placeholder="100"
              placeholderTextColor="#9CA3AF"
            />
            <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
              หากเลยวันที่ {dueDayOfMonth || '10'} ระบบจะคำนวณค่าปรับสะสม: จำนวนวันที่เลยกำหนด × ฿{lateRentFine || '100'}
            </Text>
          </View>

          {/* New Utility Fine Field */}
          <View style={styles.field}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Ionicons name="alert-circle-outline" size={16} color="#EC4899" style={{ marginRight: 4 }} />
              <Text style={[styles.label, { marginBottom: 0, color: '#374151' }]}>ค่าปรับจ่ายค่าน้ำ-ไฟล่าช้า (บาท/วัน/บิล)</Text>
            </View>
            <View style={[styles.inputWrapper, !isEditingFine && styles.inputWrapperDisabled]}>
              <TextInput
                style={[styles.inputInner, !isEditingFine && styles.inputInnerDisabled]}
                value={lateUtilityFine}
                onChangeText={setLateUtilityFine}
                keyboardType="numeric"
                editable={isEditingFine}
                placeholder="50"
                placeholderTextColor="#9CA3AF"
              />
              <Text style={styles.unitText}>฿/วัน</Text>
            </View>
            <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
              ค่าเริ่มต้น: 50 บาท/วัน (นับต่อ 1 บิลที่ค้าง)
            </Text>
          </View>

          {!isEditingFine ? (
            <TouchableOpacity style={styles.editBtn} onPress={() => setIsEditingFine(true)}>
              <Text style={styles.editBtnTxt}>แก้ไข</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.confirmBtn, saving && { opacity: 0.6 }]} onPress={handleSaveFineRates} disabled={saving}>
              <Text style={styles.confirmBtnTxt}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Space Size Setting Card */}
        <View style={[styles.card, { marginTop: 12 }]}>
          <Text style={styles.cardTitle}>ตั้งค่าขนาดล็อค</Text>

          <View style={styles.field}>
            <Text style={styles.label}>เลือกศูนย์อาหาร</Text>
            <TouchableOpacity style={styles.selectBtn} onPress={() => setShowFcModal(true)}>
              <Text style={selectedFoodCourt ? styles.selectValue : styles.selectPlaceholder}>
                {selectedFoodCourt === 1 ? 'ศูนย์อาหาร 1' : selectedFoodCourt === 2 ? 'ศูนย์อาหาร 2' : '-- เลือกศูนย์อาหาร --'}
              </Text>
              <Text style={styles.selectCaret}>▼</Text>
            </TouchableOpacity>
          </View>

          {selectedFoodCourt !== null && (
            <View style={styles.field}>
              <Text style={styles.label}>เลือกล็อค</Text>
              <TouchableOpacity style={styles.selectBtn} onPress={() => setShowStallModal(true)}>
                <Text style={selectedStall ? styles.selectValue : styles.selectPlaceholder}>
                  {selectedStall ? `ล็อค ${selectedStall.slot_number}` : '-- เลือกล็อค --'}
                </Text>
                <Text style={styles.selectCaret}>▼</Text>
              </TouchableOpacity>
            </View>
          )}

          {selectedStall !== null && (
            <View style={styles.field}>
              <Text style={styles.label}>ขนาดล็อค (ตร.ม.)</Text>
              <TextInput
                style={[styles.input, !isEditingSize && styles.inputDisabled]}
                value={stallSizeInput}
                onChangeText={setStallSizeInput}
                editable={isEditingSize}
                placeholder="เช่น 3x3 เมตร หรือ 1.5"
                placeholderTextColor="#9CA3AF"
              />

              {!isEditingSize ? (
                <TouchableOpacity style={styles.editBtn} onPress={() => setIsEditingSize(true)}>
                  <Text style={styles.editBtnTxt}>แก้ไข</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[styles.confirmBtn, savingSize && { opacity: 0.6 }]} onPress={handleSaveSize} disabled={savingSize}>
                  <Text style={styles.confirmBtnTxt}>{savingSize ? 'กำลังบันทึก...' : 'ยืนยัน'}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* System Info */}
        <View style={[styles.card, { marginTop: 12 }]}>
          <Text style={styles.cardTitle}>ℹ️ ข้อมูลระบบ</Text>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>ระบบ</Text><Text style={styles.infoValue}>BRU Food Court Management</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Backend</Text><Text style={styles.infoValue}>Node.js API</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>รุ่น</Text><Text style={styles.infoValue}>v1.0.0</Text></View>
        </View>

      </ScrollView>

      {/* FC Modal */}
      <Modal visible={showFcModal} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowFcModal(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>เลือกศูนย์อาหาร</Text>
            {[1, 2].map(fc => (
              <TouchableOpacity key={fc} style={styles.modalOption} onPress={() => handleSelectFC(fc)}>
                <Text style={styles.modalOptionText}>ศูนย์อาหาร {fc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Stall Modal */}
      <Modal visible={showStallModal} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowStallModal(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>เลือกล็อค</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {availableStalls.length > 0 ? availableStalls.map(s => (
                <TouchableOpacity key={s.slot_id} style={styles.modalOption} onPress={() => handleSelectStall(s)}>
                  <Text style={styles.modalOptionText}>ล็อค {s.slot_number}</Text>
                </TouchableOpacity>
              )) : (
                <View style={{ padding: 20, alignItems:'center' }}><Text style={{ color: '#9CA3AF' }}>ไม่มีล็อคในศูนย์นี้</Text></View>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6', padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#1F2937', marginBottom: 16 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  
  input: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 10, padding: 12, fontSize: 15, color: '#1F2937' },
  inputDisabled: { backgroundColor: '#F3F4F6', color: '#6B7280', borderColor: '#E5E7EB' },
  
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 10 },
  inputWrapperDisabled: { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' },
  inputInner: { flex: 1, padding: 12, fontSize: 15, color: '#1F2937' },
  inputInnerDisabled: { color: '#6B7280' },
  unitText: { paddingRight: 12, color: '#9CA3AF', fontSize: 15 },

  selectBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, padding: 12 },
  selectPlaceholder: { fontSize: 15, color: '#9CA3AF' },
  selectValue: { fontSize: 15, color: '#1F2937', fontWeight: '600' },
  selectCaret: { color: '#6B7280', fontSize: 12 },
  
  saveBtn: { backgroundColor: '#DC2626', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 4 },
  saveTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  
  editBtn: { backgroundColor: '#E5E7EB', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 12 },
  editBtnTxt: { color: '#374151', fontWeight: '700', fontSize: 14 },
  
  confirmBtn: { backgroundColor: '#16A34A', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 12 },
  confirmBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },

  infoRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  infoLabel: { width: 80, color: '#9CA3AF', fontSize: 13 },
  infoValue: { flex: 1, color: '#374151', fontSize: 13, fontWeight: '500' },

  /* Modal */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1F2937', marginBottom: 16 },
  modalOption: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalOptionText: { fontSize: 16, color: '#1F2937' },
});
