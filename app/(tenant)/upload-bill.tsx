import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Image, RefreshControl,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { billsAPI } from '../../services/api';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function UploadBill() {
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedBill, setSelectedBill] = useState<any>(null);

  const fetchBills = async () => {
    try {
      // ดึงบิลทั้งหมด — แสดงทุกสถานะเพื่อให้ผู้เช่าเห็นความคืบหน้า
      const res = await billsAPI.getAll();
      setBills(res.data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchBills().finally(() => setLoading(false));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBills();
    setRefreshing(false);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) setSelectedImage(result.assets[0].uri);
  };

  const handleSendBill = async () => {
    if (!selectedBill) {
      Alert.alert('แจ้งเตือน', 'กรุณาเลือกบิลที่ต้องการส่งก่อน');
      return;
    }
    if (!selectedImage) {
      Alert.alert('แจ้งเตือน', 'กรุณาแนบรูปสลิปการโอนเงินก่อน');
      return;
    }
    if (selectedBill.status !== 'PENDING' && selectedBill.status !== 'OVERDUE') {
      Alert.alert('แจ้งเตือน', 'บิลนี้ไม่ได้อยู่ในสถานะรอชำระ');
      return;
    }

    Alert.alert(
      'ยืนยันการส่งบิล',
      `คุณต้องการส่งสลิปการชำระเงินสำหรับบิลเดือน ${new Date(selectedBill.billing_month).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })} จำนวน ฿${Number(selectedBill.total_amount || 0).toLocaleString()} ไปยังผู้ดูแลระบบใช่หรือไม่?`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ส่งบิล',
          onPress: async () => {
            setUploading(true);
            try {
              const formData = new FormData();
              formData.append('paymentProof', {
                uri: selectedImage,
                type: 'image/jpeg',
                name: 'slip.jpg',
              } as any);

              await billsAPI.uploadPayment(selectedBill.expense_id, formData);

              Alert.alert(
                '✅ ส่งบิลสำเร็จ',
                'ส่งสลิปการชำระเงินไปยังผู้ดูแลระบบเรียบร้อยแล้ว กรุณารอการยืนยันจากแอดมิน',
              );
              setSelectedImage(null);
              setSelectedBill(null);
              await fetchBills(); // รีเฟรชรายการบิล
            } catch (e: any) {
              Alert.alert('เกิดข้อผิดพลาด', e?.response?.data?.message || 'ไม่สามารถส่งบิลได้ กรุณาลองใหม่อีกครั้ง');
            } finally {
              setUploading(false);
            }
          },
        },
      ],
    );
  };

  // บิลที่ส่งแล้วรอแอดมินตรวจสอบ
  const sentBills = bills.filter((b) =>
    b.payments?.some((p: any) => !p.verified_at)
  );

  // แยกบิลที่รอชำระสำหรับเลือกส่ง (ต้องอยู่ในสถานะ PENDING/OVERDUE และยังไม่ได้ส่งสลิปรอตรวจ)
  const pendingBills = bills.filter((b) =>
    (b.status === 'PENDING' || b.status === 'OVERDUE') &&
    !b.payments?.some((p: any) => !p.verified_at)
  );

  if (loading) return <LoadingSpinner />;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7C3AED']} />}
    >
      {/* ── บิลที่ส่งรอแอดมินตรวจสอบ ── */}
      {sentBills.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>🕐 รอแอดมินตรวจสอบ</Text>
          {sentBills.map((bill) => (
            <View key={bill.expense_id} style={styles.sentCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.billMonth}>
                  {new Date(bill.billing_month).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
                </Text>
                <StatusBadge status={bill.status} size="sm" />
              </View>
              <Text style={styles.billAmount}>฿{Number(bill.total_amount || 0).toLocaleString()}</Text>
              <View style={styles.pendingRow}>
                <Text style={styles.pendingIcon}>🕐</Text>
                <Text style={styles.pendingText}>ส่งสลิปแล้ว รอแอดมินยืนยัน</Text>
              </View>
            </View>
          ))}
        </>
      )}

      {/* ── เลือกบิลที่ต้องการส่ง ── */}
      <Text style={styles.sectionTitle}>📋 เลือกบิลที่ต้องการชำระ</Text>
      {pendingBills.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>✅</Text>
          <Text style={styles.emptyText}>ไม่มีบิลที่รอชำระ</Text>
        </View>
      ) : (
        pendingBills.map((bill) => (
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
            {selectedBill?.expense_id === bill.expense_id && (
              <View style={styles.selectedBadge}>
                <Text style={styles.selectedBadgeText}>✓ เลือกแล้ว</Text>
              </View>
            )}
          </TouchableOpacity>
        ))
      )}

      {/* ── อัปโหลดสลิป ── */}
      {pendingBills.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>📎 แนบสลิปการโอนเงิน</Text>
          <TouchableOpacity style={styles.imgPicker} onPress={pickImage}>
            {selectedImage ? (
              <>
                <Image source={{ uri: selectedImage }} style={styles.preview} />
                <View style={styles.changeOverlay}>
                  <Text style={styles.changeText}>แตะเพื่อเปลี่ยนรูป</Text>
                </View>
              </>
            ) : (
              <View style={styles.imgPlaceholder}>
                <Text style={styles.imgIcon}>📷</Text>
                <Text style={styles.imgText}>แตะเพื่อเลือกรูปสลิป</Text>
                <Text style={styles.imgSubText}>รองรับไฟล์ JPG, PNG</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* ── ปุ่มส่งบิล ── */}
          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!selectedBill || !selectedImage || uploading) && styles.sendBtnDisabled,
            ]}
            onPress={handleSendBill}
            disabled={!selectedBill || !selectedImage || uploading}
          >
            <Text style={styles.sendText}>
              {uploading ? '⏳ กำลังส่งบิล...' : '📤 ส่งบิลไปยังผู้ดูแลระบบ'}
            </Text>
          </TouchableOpacity>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              💡 หลังจากส่งบิลแล้ว ผู้ดูแลระบบจะตรวจสอบและยืนยันการชำระเงินภายใน 1-2 วันทำการ
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6', padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 10, marginTop: 8 },

  // Bill card (pending)
  billCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 2, borderColor: 'transparent',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  selected: { borderColor: '#7C3AED', backgroundColor: '#FAF5FF' },
  selectedBadge: {
    marginTop: 8, backgroundColor: '#7C3AED', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start',
  },
  selectedBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // Sent card (waiting admin)
  sentCard: {
    backgroundColor: '#FFF7ED', borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1.5, borderColor: '#FED7AA',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  pendingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  pendingIcon: { fontSize: 14, marginRight: 6 },
  pendingText: { fontSize: 12, color: '#92400E', fontWeight: '600' },

  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  billMonth: { fontWeight: '700', color: '#1F2937' },
  billAmount: { fontSize: 18, fontWeight: '800', color: '#7C3AED', marginTop: 4 },
  billDue: { color: '#9CA3AF', fontSize: 12, marginTop: 2 },

  // Image picker
  imgPicker: {
    backgroundColor: '#fff', borderRadius: 14, height: 200, marginBottom: 14,
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderStyle: 'dashed', borderColor: '#D1D5DB',
    overflow: 'hidden',
  },
  imgPlaceholder: { alignItems: 'center' },
  imgIcon: { fontSize: 40, marginBottom: 8 },
  imgText: { color: '#374151', fontWeight: '600' },
  imgSubText: { color: '#9CA3AF', fontSize: 12, marginTop: 4 },
  preview: { width: '100%', height: '100%', resizeMode: 'cover' },
  changeOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)', paddingVertical: 8, alignItems: 'center',
  },
  changeText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // Send button
  sendBtn: {
    backgroundColor: '#7C3AED', borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginBottom: 12,
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  sendBtnDisabled: { backgroundColor: '#C4B5FD', shadowOpacity: 0 },
  sendText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Info box
  infoBox: {
    backgroundColor: '#EFF6FF', borderRadius: 12, padding: 14, marginBottom: 24,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  infoText: { color: '#1E40AF', fontSize: 12, lineHeight: 18 },

  // Empty state
  empty: { alignItems: 'center', paddingVertical: 30 },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyText: { color: '#9CA3AF' },
});
