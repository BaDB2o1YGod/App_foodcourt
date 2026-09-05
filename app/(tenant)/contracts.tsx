import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, Modal, Image, SafeAreaView, Linking } from 'react-native';
import { contractsAPI, settingsAPI } from '../../services/api';
import api from '../../services/api';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Ionicons } from '@expo/vector-icons';

export default function Contracts() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [resContracts, resSettings] = await Promise.all([
        contractsAPI.getAll(),
        settingsAPI.getUtilityRates()
      ]);
      setContracts(resContracts.data.data || []);
      setSettings(resSettings.data.data || {});
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData().finally(() => setLoading(false)); }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await fetchData(); setRefreshing(false); }} colors={['#7C3AED']} />}
      >
        {contracts.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📄</Text>
            <Text style={styles.emptyText}>ไม่พบข้อมูลสัญญาเช่า</Text>
          </View>
        ) : (
          contracts.map((c) => {
            let docUrl = c.contractImage || c.document_url || c.contract_file || c.image_url;
            if (docUrl && !docUrl.startsWith('http')) {
              const baseUrl = api.defaults.baseURL?.replace('/api', '') || 'http://localhost:5000';
              const cleanPath = docUrl.startsWith('/') ? docUrl.substring(1) : docUrl;
              docUrl = `${baseUrl}/${cleanPath}`;
            }
            return (
              <View key={c.contract_id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.contractNum}>สัญญา #{c.contract_number}</Text>
                  <StatusBadge status={c.status} size="sm" />
                </View>
                <View style={styles.rows}>
                  <InfoRow label="ล็อค" value={`${c.slot?.slot_number || '-'}`} />
                  <InfoRow label="เริ่มสัญญา" value={new Date(c.start_date).toLocaleDateString('th-TH')} />
                  <InfoRow label="สิ้นสุดสัญญา" value={new Date(c.end_date).toLocaleDateString('th-TH')} />
                  <InfoRow label="ค่าเช่ารายเดือน" value={`฿${Number(c.monthly_rent || 0).toLocaleString()}`} />
                  <InfoRow label="เงินประกัน" value={`฿${Number(c.deposit_amount || 0).toLocaleString()}`} />
                  {settings && (
                    <>
                      <InfoRow label="ค่าน้ำประปา" value={`${settings.waterRatePerUnit || '-'} ฿/หน่วย`} />
                      <InfoRow label="ค่าไฟฟ้า" value={`${settings.electricRatePerUnit || '-'} ฿/หน่วย`} />
                      <InfoRow label="ค่าปรับล่าช้า (ค่าเช่า)" value={`${settings.lateRentFine || '-'} ฿/วัน`} />
                      <InfoRow label="ค่าปรับล่าช้า (น้ำไฟ)" value={`${settings.lateUtilityFine || '-'} ฿/วัน`} />
                    </>
                  )}
                </View>

                {docUrl && (
                  <TouchableOpacity
                    style={styles.docBtn}
                    onPress={() => setSelectedDoc(docUrl)}
                  >
                    <Ionicons name="document-text-outline" size={18} color="#7C3AED" />
                    <Text style={styles.docBtnText}>ดูเอกสารสัญญา</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Modal แสดงเอกสาร */}
      <Modal visible={!!selectedDoc} transparent animationType="fade" onRequestClose={() => setSelectedDoc(null)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>เอกสารสัญญา</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {selectedDoc && (
                <TouchableOpacity onPress={() => Linking.openURL(selectedDoc)} style={styles.closeBtn} accessibilityLabel="เปิดในเบราว์เซอร์">
                  <Ionicons name="open-outline" size={22} color="#374151" />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setSelectedDoc(null)} style={styles.closeBtn} accessibilityLabel="ปิด">
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.modalContent}>
            {selectedDoc && (
              <Image 
                source={{ uri: selectedDoc }} 
                style={styles.docImage}
                resizeMode="contain"
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' }}>
      <Text style={{ color: '#6B7280', fontSize: 14 }}>{label}</Text>
      <Text style={{ color: '#1F2937', fontSize: 14, fontWeight: '500' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6', padding: 16 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  contractNum: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  rows: { marginBottom: 10 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#9CA3AF', fontSize: 15 },
  docBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3E8FF',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  docBtnText: {
    color: '#7C3AED',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    marginTop: 60,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeBtn: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#fff',
    paddingBottom: 40,
  },
  docImage: {
    width: '100%',
    height: '100%',
  },
});
