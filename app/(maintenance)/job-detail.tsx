import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, TextInput, Image, Modal, TouchableWithoutFeedback } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { maintenanceAPI } from '../../services/api';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const STATUS_OPTIONS = [
  { value: 'IN_PROGRESS', label: '🔄 กำลังดำเนินการ' },
  { value: 'COMPLETED', label: 'เสร็จสิ้น' },
  { value: 'REJECTED', label: 'ปฏิเสธ' },
];

export default function JobDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [updating, setUpdating] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await maintenanceAPI.getById(Number(id));
        setJob(res.data.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [id]);

  const handleUpdate = async (status: string) => {
    setUpdating(true);
    try {
      await maintenanceAPI.updateStatus(Number(id), { status, comment });
      Alert.alert('สำเร็จ', 'อัปเดตสถานะเรียบร้อย');
      const res = await maintenanceAPI.getById(Number(id));
      setJob(res.data.data);
      setComment('');
    } catch (e: any) {
      Alert.alert('ผิดพลาด', e?.response?.data?.message || 'ไม่สามารถอัปเดตได้');
    } finally { setUpdating(false); }
  };

  if (loading) return <LoadingSpinner />;
  if (!job) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>ไม่พบข้อมูล</Text></View>;

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.jobTitle}>{job.title}</Text>
          <StatusBadge status={job.status} />
        </View>
        {job.category && <Text style={styles.cat}>🏷 {job.category}</Text>}
        {job.description && <Text style={styles.desc}>{job.description}</Text>}
        <Text style={styles.meta}>📍 ล็อก {job.slot?.slot_number} • 📅 {new Date(job.requested_at).toLocaleDateString('th-TH')}</Text>
        
        {/* Images attached by tenant */}
        {job.images && job.images.filter((img: any) => img.image_type === 'request').length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
            {job.images.filter((img: any) => img.image_type === 'request').map((img: any) => (
              <TouchableOpacity key={img.image_id} onPress={() => setSelectedImage(img.image_url)}>
                <Image source={{ uri: img.image_url }} style={styles.attachedImage} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Update Status */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>สถานะงาน</Text>
        {job.status === 'COMPLETED' || job.status === 'REJECTED' ? (
          <View style={styles.finishedBox}>
            <Text style={styles.finishedText}>
              {job.status === 'COMPLETED' ? 'งานนี้เสร็จสิ้นแล้ว' : 'งานนี้ถูกปฏิเสธแล้ว'}
            </Text>
          </View>
        ) : (
          <>
            <TextInput
              style={styles.commentInput}
              placeholder="หมายเหตุ / รายละเอียดการซ่อม..."
              placeholderTextColor="#9CA3AF"
              value={comment}
              onChangeText={setComment}
              multiline
            />
            <View style={styles.btnGrid}>
              {STATUS_OPTIONS.filter((s) => s.value !== job.status).map((s) => (
                <TouchableOpacity
                  key={s.value}
                  style={[styles.statusBtn, updating && { opacity: 0.6 }]}
                  onPress={() => handleUpdate(s.value)}
                  disabled={updating}
                >
                  <Text style={styles.statusBtnText}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </View>

      {/* Timeline */}
      {job.updates && job.updates.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>ประวัติการอัปเดต</Text>
          {job.updates.map((u: any) => (
            <View key={u.update_id} style={styles.timelineItem}>
              <View style={styles.dot} />
              <View style={{ flex: 1 }}>
                <StatusBadge status={u.status} size="sm" />
                {u.comment && <Text style={styles.comment}>{u.comment}</Text>}
                <Text style={styles.updateDate}>{new Date(u.updated_at).toLocaleDateString('th-TH')}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Image Modal */}
      <Modal visible={!!selectedImage} transparent={true} animationType="fade">
        <View style={styles.modalBackground}>
          <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedImage(null)}>
            <Text style={styles.closeButtonText}>✕ ปิด</Text>
          </TouchableOpacity>
          <TouchableWithoutFeedback>
            <Image source={{ uri: selectedImage || undefined }} style={styles.fullImage} resizeMode="contain" />
          </TouchableWithoutFeedback>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { backgroundColor: '#fff', padding: 16, margin: 16, borderRadius: 16, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  jobTitle: { fontSize: 16, fontWeight: '800', color: '#1F2937', flex: 1, marginRight: 10 },
  cat: { fontSize: 13, color: '#6B7280', marginBottom: 6 },
  desc: { fontSize: 14, color: '#374151', marginBottom: 8, lineHeight: 20 },
  meta: { fontSize: 12, color: '#9CA3AF' },
  card: { backgroundColor: '#fff', margin: 16, marginTop: 0, borderRadius: 16, padding: 16, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 12 },
  commentInput: {
    backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10,
    padding: 12, fontSize: 14, color: '#1F2937', height: 80, textAlignVertical: 'top', marginBottom: 12,
  },
  btnGrid: { gap: 8 },
  statusBtn: { backgroundColor: '#F9FAFB', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1.5, borderColor: '#E5E7EB' },
  statusBtnText: { fontWeight: '700', color: '#374151' },
  timelineItem: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#F59E0B', marginTop: 4 },
  comment: { fontSize: 13, color: '#374151', marginTop: 4, marginBottom: 2 },
  updateDate: { fontSize: 11, color: '#9CA3AF' },
  finishedBox: { alignItems: 'center', paddingVertical: 20 },
  finishedIcon: { fontSize: 36, marginBottom: 8 },
  finishedText: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  finishedSub: { fontSize: 12, color: '#9CA3AF' },
  imageScroll: { marginTop: 14, flexDirection: 'row' },
  attachedImage: { width: 100, height: 100, borderRadius: 8, marginRight: 10, backgroundColor: '#E5E7EB' },
  modalBackground: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  fullImage: { width: '100%', height: '80%' },
  closeButton: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 },
  closeButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
