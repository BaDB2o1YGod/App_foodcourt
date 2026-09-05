import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, Modal, Image, TouchableWithoutFeedback } from 'react-native';
import { maintenanceAPI } from '../../services/api';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function TrackRepairs() {
  const [repairs, setRepairs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const res = await maintenanceAPI.getAll();
      setRepairs(res.data.data || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData().finally(() => setLoading(false)); }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await fetchData(); setRefreshing(false); }} colors={['#7C3AED']} />}
    >
      {repairs.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔧</Text>
          <Text style={styles.emptyText}>ยังไม่มีรายการแจ้งซ่อม</Text>
        </View>
      ) : (
        repairs.map((req) => (
          <TouchableOpacity key={req.request_id} style={styles.card} onPress={() => setSelectedJob(req)}>
            <View style={styles.cardHeader}>
              <Text style={styles.reqTitle} numberOfLines={1}>{req.title}</Text>
              <StatusBadge status={req.status} size="sm" />
            </View>
            {req.category && <Text style={styles.meta}>🏷 {req.category}</Text>}
            <Text style={styles.meta}> {new Date(req.requested_at).toLocaleDateString('th-TH')}</Text>
            {req.updates && req.updates.length > 0 && (
              <View style={styles.timeline}>
                <Text style={styles.timelineTitle}>อัปเดตล่าสุด:</Text>
                {req.updates.slice(-1).map((u: any) => (
                  <View key={u.update_id} style={styles.timelineItem}>
                    <View style={styles.dot} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.updateComment}>{u.comment || 'ไม่มีข้อความ'}</Text>
                      <Text style={styles.updateDate}>{new Date(u.updated_at).toLocaleDateString('th-TH')}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </TouchableOpacity>
        ))
      )}

      {/* Job Details Modal */}
      <Modal visible={!!selectedJob} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedJob(null)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>รายละเอียดการแจ้งซ่อม</Text>
            <TouchableOpacity onPress={() => setSelectedJob(null)} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            <View style={styles.modalSection}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <Text style={styles.modalJobTitle}>{selectedJob?.title}</Text>
                <StatusBadge status={selectedJob?.status} />
              </View>
              {selectedJob?.category && <Text style={styles.meta}>🏷 {selectedJob.category}</Text>}
              <Text style={styles.meta}>📍 ล็อค {selectedJob?.slot?.slot_number || '-'}</Text>
              <Text style={styles.meta}> แจ้งเมื่อ {selectedJob?.requested_at ? new Date(selectedJob.requested_at).toLocaleDateString('th-TH') : ''}</Text>
              {selectedJob?.description && <Text style={styles.modalDesc}>{selectedJob.description}</Text>}
            </View>

            {/* Request Images */}
            {selectedJob?.images && selectedJob.images.filter((img: any) => img.image_type === 'request').length > 0 && (
              <View style={styles.modalSection}>
                <Text style={styles.sectionTitle}>📷 รูปถ่ายตอนแจ้งซ่อม:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {selectedJob.images.filter((img: any) => img.image_type === 'request').map((img: any) => (
                    <TouchableOpacity key={img.image_id} onPress={() => setSelectedImage(img.image_url)}>
                      <Image source={{ uri: img.image_url }} style={styles.thumbnail} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Completion Images */}
            {selectedJob?.images && selectedJob.images.filter((img: any) => img.image_type === 'completion').length > 0 && (
              <View style={styles.modalSection}>
                <Text style={styles.sectionTitleSuccess}>✅ รูปถ่ายหลักฐานส่งงาน:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {selectedJob.images.filter((img: any) => img.image_type === 'completion').map((img: any) => (
                    <TouchableOpacity key={img.image_id} onPress={() => setSelectedImage(img.image_url)}>
                      <Image source={{ uri: img.image_url }} style={styles.thumbnail} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Full Timeline */}
            <View style={styles.modalSection}>
              <Text style={styles.sectionTitle}>🕒 ประวัติการทำงานทั้งหมด:</Text>
              {selectedJob?.updates && selectedJob.updates.length > 0 ? (
                selectedJob.updates.map((u: any) => (
                  <View key={u.update_id} style={styles.timelineItem}>
                    <View style={styles.dot} />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <StatusBadge status={u.status} size="sm" />
                        <Text style={styles.updateDateList}> • {new Date(u.updated_at).toLocaleDateString('th-TH')} {new Date(u.updated_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</Text>
                      </View>
                      <Text style={styles.updateCommentFull}>{u.comment || '-'}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>ยังไม่มีประวัติการอัปเดต</Text>
              )}
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* Fullscreen Image Viewer Modal */}
      <Modal visible={!!selectedImage} transparent={true} animationType="fade" onRequestClose={() => setSelectedImage(null)}>
        <View style={styles.imageModalBackground}>
          <TouchableOpacity style={styles.imageCloseBtn} onPress={() => setSelectedImage(null)}>
            <Text style={styles.imageCloseBtnText}>✕ ปิด</Text>
          </TouchableOpacity>
          <TouchableWithoutFeedback onPress={() => setSelectedImage(null)}>
            <Image source={{ uri: selectedImage || undefined }} style={styles.fullImage} resizeMode="contain" />
          </TouchableWithoutFeedback>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6', padding: 16 },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  reqTitle: { fontSize: 14, fontWeight: '700', color: '#1F2937', flex: 1, marginRight: 8 },
  meta: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  timeline: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 10 },
  timelineTitle: { fontSize: 12, fontWeight: '600', color: '#9CA3AF', marginBottom: 6 },
  timelineItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#7C3AED', marginTop: 4 },
  updateComment: { fontSize: 13, color: '#374151' },
  updateDate: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#9CA3AF', fontSize: 15 },
  modalContainer: { flex: 1, backgroundColor: '#F3F4F6' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  closeBtn: { padding: 8, backgroundColor: '#F3F4F6', borderRadius: 20 },
  closeBtnText: { fontSize: 16, fontWeight: 'bold', color: '#4B5563' },
  modalBody: { padding: 16 },
  modalSection: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  modalJobTitle: { fontSize: 16, fontWeight: '800', color: '#1F2937', flex: 1, marginRight: 8 },
  modalDesc: { fontSize: 14, color: '#374151', marginTop: 12, lineHeight: 22 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#4B5563', marginBottom: 10 },
  sectionTitleSuccess: { fontSize: 14, fontWeight: '700', color: '#059669', marginBottom: 10 },
  thumbnail: { width: 100, height: 100, borderRadius: 8, marginRight: 10, backgroundColor: '#E5E7EB' },
  updateDateList: { fontSize: 12, color: '#9CA3AF' },
  updateCommentFull: { fontSize: 14, color: '#1F2937', lineHeight: 20 },
  imageModalBackground: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  fullImage: { width: '100%', height: '80%' },
  imageCloseBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 },
  imageCloseBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
