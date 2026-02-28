import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { billsAPI } from '../../services/api';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function UploadBill() {
  const [pendingBills, setPendingBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedBill, setSelectedBill] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await billsAPI.getAll({ status: 'PENDING' });
        setPendingBills(res.data.data || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) setSelectedImage(result.assets[0].uri);
  };

  const handleUpload = async () => {
    if (!selectedBill) { Alert.alert('แจ้งเตือน', 'กรุณาเลือกบิลก่อน'); return; }
    if (!selectedImage) { Alert.alert('แจ้งเตือน', 'กรุณาเลือกรูปสลิปก่อน'); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('payment_slip', { uri: selectedImage, type: 'image/jpeg', name: 'slip.jpg' } as any);
      formData.append('payment_amount', selectedBill.total_amount?.toString());
      formData.append('payment_date', new Date().toISOString());
      await billsAPI.uploadPayment(selectedBill.expense_id, formData);
      Alert.alert('สำเร็จ', 'อัปโหลดสลิปเรียบร้อยแล้ว');
      setSelectedImage(null);
      setSelectedBill(null);
    } catch (e: any) {
      Alert.alert('เกิดข้อผิดพลาด', e?.response?.data?.message || 'ไม่สามารถอัปโหลดได้');
    } finally { setUploading(false); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>เลือกบิลที่ต้องการชำระ</Text>
      {pendingBills.map((bill) => (
        <TouchableOpacity
          key={bill.expense_id}
          style={[styles.billCard, selectedBill?.expense_id === bill.expense_id && styles.selected]}
          onPress={() => setSelectedBill(bill)}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.billMonth}>
              {new Date(bill.billing_month).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
            </Text>
            <StatusBadge status={bill.status} size="sm" />
          </View>
          <Text style={styles.billAmount}>฿{Number(bill.total_amount || 0).toLocaleString()}</Text>
          <Text style={styles.billDue}>ครบกำหนด: {new Date(bill.due_date).toLocaleDateString('th-TH')}</Text>
        </TouchableOpacity>
      ))}

      {pendingBills.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>✅</Text>
          <Text style={styles.emptyText}>ไม่มีบิลที่รอชำระ</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>อัปโหลดสลิป</Text>
      <TouchableOpacity style={styles.imgPicker} onPress={pickImage}>
        {selectedImage ? (
          <Image source={{ uri: selectedImage }} style={styles.preview} />
        ) : (
          <View style={styles.imgPlaceholder}>
            <Text style={styles.imgIcon}>📷</Text>
            <Text style={styles.imgText}>แตะเพื่อเลือกรูปสลิป</Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.uploadBtn, uploading && { opacity: 0.6 }]}
        onPress={handleUpload}
        disabled={uploading}
      >
        <Text style={styles.uploadText}>{uploading ? 'กำลังอัปโหลด...' : '📤 ส่งสลิปชำระเงิน'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6', padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 10, marginTop: 8 },
  billCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 2, borderColor: 'transparent',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  selected: { borderColor: '#7C3AED' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  billMonth: { fontWeight: '700', color: '#1F2937' },
  billAmount: { fontSize: 18, fontWeight: '800', color: '#7C3AED', marginTop: 4 },
  billDue: { color: '#9CA3AF', fontSize: 12, marginTop: 2 },
  imgPicker: {
    backgroundColor: '#fff', borderRadius: 14, height: 200, marginBottom: 14,
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderStyle: 'dashed', borderColor: '#D1D5DB',
    overflow: 'hidden',
  },
  imgPlaceholder: { alignItems: 'center' },
  imgIcon: { fontSize: 40, marginBottom: 8 },
  imgText: { color: '#9CA3AF' },
  preview: { width: '100%', height: '100%', resizeMode: 'cover' },
  uploadBtn: {
    backgroundColor: '#7C3AED', borderRadius: 12, paddingVertical: 15,
    alignItems: 'center', marginBottom: 24,
  },
  uploadText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 30 },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyText: { color: '#9CA3AF' },
});
