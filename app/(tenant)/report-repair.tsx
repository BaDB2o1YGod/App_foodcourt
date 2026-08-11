import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StatusBadge from '../../components/ui/StatusBadge';
import { maintenanceAPI } from '../../services/api';

const CATEGORIES = ['ระบบไฟฟ้า', 'ระบบประปา', 'โครงสร้าง', 'อุปกรณ์', 'อื่นๆ'];

export default function ReportRepair() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await maintenanceAPI.getAll();
        setMyRequests(res.data.data || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
    });
    if (!result.canceled) setImages(result.assets);
  };

  const handleSubmit = async () => {
    if (!title.trim()) { Alert.alert('แจ้งเตือน', 'กรุณากรอกหัวข้อปัญหา'); return; }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('category', category);
      images.forEach((asset, i) => {
        let mimeType = asset.mimeType;
        const ext = (asset.fileName || asset.uri).split('.').pop()?.toLowerCase() || 'jpg';
        
        // Force unique filename to prevent overwriting/backend errors
        const fileName = `repair_${Date.now()}_${i}.${ext}`;
        
        if (!mimeType) {
          if (ext === 'png') mimeType = 'image/png';
          else if (ext === 'heic' || ext === 'heif') mimeType = 'image/heic';
          else mimeType = 'image/jpeg';
        }

        formData.append('images', { 
          uri: asset.uri, 
          type: mimeType, 
          name: fileName 
        } as any);
      });
      await maintenanceAPI.create(formData);
      Alert.alert('สำเร็จ', 'ส่งรายการแจ้งซ่อมเรียบร้อยแล้ว');
      setTitle(''); setDescription(''); setCategory(''); setImages([]);
      const res = await maintenanceAPI.getAll();
      setMyRequests(res.data.data || []);
    } catch (e: any) {
      Alert.alert('ผิดพลาด', e?.response?.data?.message || 'ไม่สามารถส่งรายการได้');
    } finally { setSubmitting(false); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* Form */}
      <View style={styles.form}>
        <Text style={styles.formTitle}>แบบฟอร์มแจ้งซ่อม</Text>
        <Text style={styles.label}>หัวข้อปัญหา *</Text>
        <TextInput style={styles.input} placeholder="เช่น ไฟดับ, ท่อแตก" placeholderTextColor="#9CA3AF" value={title} onChangeText={setTitle} />
        <Text style={styles.label}>รายละเอียด</Text>
        <TextInput style={[styles.input, { height: 90 }]} placeholder="อธิบายปัญหาเพิ่มเติม..." placeholderTextColor="#9CA3AF" value={description} onChangeText={setDescription} multiline />
        <Text style={styles.label}>ประเภท</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.catChip, category === cat && styles.catChipActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.catText, category === cat && styles.catTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity style={styles.imgBtn} onPress={pickImages}>
          <Text style={styles.imgBtnText}>📷 เลือกรูปภาพ {images.length > 0 ? `(${images.length} รูป)` : ''}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.6 }]} onPress={handleSubmit} disabled={submitting}>
          <Text style={styles.submitText}>{submitting ? 'กำลังส่ง...' : '📤 ส่งรายการแจ้งซ่อม'}</Text>
        </TouchableOpacity>
      </View>

      {/* My Requests */}
      <Text style={styles.sectionTitle}>รายการแจ้งซ่อมของฉัน</Text>
      {myRequests.map((req) => (
        <View key={req.request_id} style={styles.reqCard}>
          <View style={styles.reqHeader}>
            <Text style={styles.reqTitle} numberOfLines={1}>{req.title}</Text>
            <StatusBadge status={req.status} size="sm" />
          </View>
          {req.category && <Text style={styles.reqCat}>🏷 {req.category}</Text>}
          <Text style={styles.reqDate}>{new Date(req.requested_at).toLocaleDateString('th-TH')}</Text>
        </View>
      ))}
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
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 10, padding: 12, fontSize: 14, color: '#1F2937', marginBottom: 14,
    textAlignVertical: 'top',
  },
  catChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, borderWidth: 1.5,
    borderColor: '#E5E7EB', marginRight: 8, backgroundColor: '#fff',
  },
  catChipActive: { borderColor: '#7C3AED', backgroundColor: '#F5F3FF' },
  catText: { color: '#6B7280', fontSize: 13 },
  catTextActive: { color: '#7C3AED', fontWeight: '600' },
  imgBtn: {
    backgroundColor: '#F3F4F6', borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 12,
  },
  imgBtnText: { color: '#374151', fontWeight: '600' },
  submitBtn: { backgroundColor: '#7C3AED', borderRadius: 10, padding: 14, alignItems: 'center' },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginHorizontal: 16, marginTop: 8, marginBottom: 8 },
  reqCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginHorizontal: 16, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  reqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  reqTitle: { fontSize: 14, fontWeight: '700', color: '#1F2937', flex: 1, marginRight: 8 },
  reqCat: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  reqDate: { fontSize: 12, color: '#9CA3AF' },
});
