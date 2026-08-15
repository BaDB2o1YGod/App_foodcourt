import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StatusBadge from '../../components/ui/StatusBadge';
import { contractsAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

const CANCELLATION_REASONS = [
  'ยอดขายไม่ตรงตามเป้าหมาย',
  'ต้องการย้ายสถานที่',
  'เปลี่ยนประเภทธุรกิจ',
  'ปัญหาเรื่องสุขภาพ/ส่วนตัว',
  'เหตุผลอื่นๆ'
];

export default function CancellationForm() {
  const { user } = useAuthStore();
  const [reason, setReason] = useState('');
  const [additionalNote, setAdditionalNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      // Fetch only the requests for this tenant. If backend filters by token, this is fine.
      // If we need to pass tenant_id, we would do it here. 
      // Fetch only the requests for this tenant. 
      const res = await contractsAPI.getCancellationRequests();
      setMyRequests(res.data.data || []);
    } catch (e) {
      console.warn('Failed to fetch cancellation requests:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!reason) {
      Alert.alert('แจ้งเตือน', 'กรุณาเลือกเหตุผลในการยกเลิกสัญญา');
      return;
    }
    
    Alert.alert('ยืนยันส่งคำร้อง', 'คุณแน่ใจหรือไม่ว่าต้องการส่งฟอร์มขอยกเลิกสัญญาเช่า?', [
      { text: 'ยกเลิก', style: 'cancel' },
      { 
        text: 'ยืนยัน', 
        style: 'destructive', 
        onPress: async () => {
          setSubmitting(true);
          try {
            // Need the active contract ID. Let's fetch it if not available, or backend can infer if we pass contractId: 0 or the backend does it.
            // But we must pass a contract ID to the endpoint. We'll pass 0 and let backend use active contract, or we fetch it first.
            // To be safe, we assume backend takes `0` or we can just fetch the active contract.
            const contractsRes = await contractsAPI.getAll();
            const activeContract = contractsRes.data.data.find((c: any) => c.status === 'ACTIVE');
            
            if (!activeContract) throw new Error('ไม่พบสัญญาเช่าที่กำลังใช้งานอยู่');

            await contractsAPI.cancelRequest(activeContract.contract_id, {
              cancellation_reason: reason,
              cancellation_note: additionalNote,
            });
            Alert.alert('สำเร็จ', 'ส่งฟอร์มคำร้องขอยกเลิกสัญญาเช่าเรียบร้อยแล้ว');
            setReason('');
            setAdditionalNote('');
            fetchRequests();
          } catch (e: any) {
            Alert.alert('ผิดพลาด', e?.response?.data?.message || 'ไม่สามารถส่งคำร้องได้');
          } finally {
            setSubmitting(false);
          }
        }
      }
    ]);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* Form */}
      <View style={styles.form}>
        <Text style={styles.formTitle}>แบบฟอร์มขอยกเลิกสัญญาเช่า</Text>
        
        <Text style={styles.label}>เหตุผลที่ขอยกเลิก *</Text>
        <View style={styles.reasonContainer}>
          {CANCELLATION_REASONS.map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.radioBtn, reason === r && styles.radioBtnActive]}
              onPress={() => setReason(r)}
            >
              <View style={[styles.radioOuter, reason === r && styles.radioOuterActive]}>
                {reason === r && <View style={styles.radioInner} />}
              </View>
              <Text style={[styles.radioText, reason === r && styles.radioTextActive]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>รายละเอียดเพิ่มเติม (ถ้ามี)</Text>
        <TextInput 
          style={[styles.input, { height: 90 }]} 
          placeholder="อธิบายรายละเอียดเพิ่มเติม..." 
          placeholderTextColor="#9CA3AF" 
          value={additionalNote} 
          onChangeText={setAdditionalNote} 
          multiline 
        />
        
        <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.6 }]} onPress={handleSubmit} disabled={submitting}>
          <Text style={styles.submitText}>{submitting ? 'กำลังส่ง...' : '📤 ส่งคำร้องขอยกเลิกเช่า'}</Text>
        </TouchableOpacity>
      </View>

      {/* My Requests */}
      <Text style={styles.sectionTitle}>ประวัติคำร้องของฉัน</Text>
      {myRequests.length === 0 ? (
        <Text style={styles.emptyText}>ยังไม่มีประวัติการส่งคำร้อง</Text>
      ) : (
        myRequests.map((req) => (
          <View key={req.id?.toString() || Math.random().toString()} style={styles.reqCard}>
            <View style={styles.reqHeader}>
              <Text style={styles.reqTitle} numberOfLines={1}>ขอยกเลิก: {req.cancellation_reason}</Text>
              <StatusBadge status={req.status} size="sm" />
            </View>
            {req.cancellation_note ? <Text style={styles.reqNote}>📝 {req.cancellation_note}</Text> : null}
            <Text style={styles.reqDate}>ส่งเมื่อ: {new Date(req.cancellation_requested_at || Date.now()).toLocaleDateString('th-TH')}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  form: {
    margin: 16, backgroundColor: '#fff', borderRadius: 16, padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  formTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 10, marginTop: 4 },
  reasonContainer: { marginBottom: 16 },
  radioBtn: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12,
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, marginBottom: 8,
    backgroundColor: '#fff'
  },
  radioBtnActive: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  radioOuter: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#D1D5DB',
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  radioOuterActive: { borderColor: '#EF4444' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444' },
  radioText: { color: '#4B5563', fontSize: 14, flex: 1 },
  radioTextActive: { color: '#B91C1C', fontWeight: '600' },
  input: {
    backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 10, padding: 12, fontSize: 14, color: '#1F2937', marginBottom: 16,
    textAlignVertical: 'top',
  },
  submitBtn: { backgroundColor: '#EF4444', borderRadius: 10, padding: 14, alignItems: 'center' },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginHorizontal: 16, marginTop: 8, marginBottom: 8 },
  emptyText: { color: '#6B7280', fontSize: 14, textAlign: 'center', marginTop: 20, marginBottom: 40 },
  reqCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginHorizontal: 16, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  reqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  reqTitle: { fontSize: 14, fontWeight: '700', color: '#1F2937', flex: 1, marginRight: 8 },
  reqNote: { fontSize: 13, color: '#6B7280', marginBottom: 6 },
  reqDate: { fontSize: 12, color: '#9CA3AF' },
});
