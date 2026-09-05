import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StatusBadge from '../../components/ui/StatusBadge';
import { Ionicons } from '@expo/vector-icons';
import api, { contractsAPI, usersAPI, settingsAPI } from '../../services/api';

export default function ExecutiveTenants() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [allContracts, setAllContracts] = useState<any[]>([]);
  const [tenantContracts, setTenantContracts] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState(false);

  const formatName = (f?: string, l?: string) => {
    if (!f) return '';
    if (!l) return f;
    if (f.includes(l)) return f;
    return `${f} ${l}`;
  };

  const getInitials = (f?: string) => {
    if (!f) return '';
    const noVowels = f.replace(/[ะาิีึืุูเแโใไั๊๋็์]/g, '');
    return noVowels.substring(0, 2);
  };

  const fetchData = async () => {
    try {
      const [usersRes, contractsRes, settingsRes] = await Promise.all([
        usersAPI.getAll({ role: 'TENANT' }),
        contractsAPI.getAll(),
        settingsAPI.getUtilityRates().catch(() => null),
      ]);
      setTenants(usersRes?.data?.data || []);
      setAllContracts(contractsRes?.data?.data || []);
      setSettings(settingsRes?.data?.data || null);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData().finally(() => setLoading(false)); }, []);

  const handleSelectTenant = (tenant: any) => {
    setSelected(tenant);
    const matched = allContracts.filter(
      (c) => c.tenant_id === tenant.user_id || c.tenant?.user_id === tenant.user_id
    );
    setTenantContracts(matched);
  };

  const filtered = tenants.filter((t) =>
    `${t.first_name} ${t.last_name} ${t.username}`.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <LoadingSpinner />;

  return (
    <View style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 ค้นหาผู้เช่า..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
        />
      </View>
      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await fetchData(); setRefreshing(false); }} colors={['#DC2626']} />}
      >
        {filtered.map((t) => (
          <View key={t.user_id} style={styles.card}>
            <View style={styles.avatarRow}>
              {t.profile_image_url ? (
                <Image source={{ uri: t.profile_image_url }} style={styles.avatarImageSmall} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{getInitials(t.first_name)}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{formatName(t.first_name, t.last_name)}</Text>
                <Text style={styles.username}>@{t.username}</Text>
              </View>
              <TouchableOpacity onPress={() => handleSelectTenant(t)} style={styles.detailBtn}>
                <Text style={styles.detailText}>รายละเอียด</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Detail Modal */}
      <Modal visible={!!selected} animationType="slide" transparent>
        <View style={styles.overlay}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}>
          <View style={styles.modal}>
            <View style={styles.modalHeaderContent}>
              <View style={styles.avatarContainer}>
                {selected?.profile_image_url ? (
                  <Image source={{ uri: selected.profile_image_url }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitials}>{getInitials(selected?.first_name)}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.modalName}>{formatName(selected?.first_name, selected?.last_name)}</Text>
              <Text style={styles.modalUsername}>@{selected?.username}</Text>
            </View>
            <View style={styles.infoGroup}>
              {selected?.id_card_number && <InfoRow label="รหัส ปชช." value={selected.id_card_number} />}
              {selected?.phone && <InfoRow label="โทร" value={selected.phone} />}
              {selected?.email && <InfoRow label="อีเมล" value={selected.email} />}

              <InfoRow
                label="ที่อยู่"
                value={[
                  selected?.address_line,
                  selected?.subdistrict ? `ต.${selected.subdistrict}` : '',
                  selected?.district ? `อ.${selected.district}` : '',
                  selected?.province ? `จ.${selected.province}` : '',
                  selected?.postal_code
                ].filter(Boolean).join(' ') || '-'}
              />

              {selected?.created_at && (
                <InfoRow label="วันที่สมัคร" value={new Date(selected.created_at).toLocaleDateString('th-TH')} />
              )}
            </View>

            {/* Rental Contracts Section */}
            <View style={styles.contractSection}>
              <Text style={styles.contractSectionTitle}>📄 สัญญาเช่า</Text>
              {tenantContracts.length === 0 ? (
                <Text style={styles.noContract}>ไม่มีสัญญาเช่า</Text>
              ) : (
                tenantContracts.map((c) => {
                  let docUrl = c.contractImage || c.document_url || c.contract_file || c.image_url;
                  if (docUrl && !docUrl.startsWith('http')) {
                    const baseUrl = api.defaults.baseURL?.replace('/api', '') || 'http://localhost:5000';
                    const cleanPath = docUrl.startsWith('/') ? docUrl.substring(1) : docUrl;
                    docUrl = `${baseUrl}/${cleanPath}`;
                  }

                  return (
                    <View key={c.contract_id} style={styles.contractCard}>
                      <View style={styles.contractHeader}>
                        <Text style={styles.contractNum}>สัญญา #{c.contract_number}</Text>
                        <StatusBadge status={c.status} size="sm" />
                      </View>
                      <ContractInfoRow label="ล็อค" value={`${c.slot?.slot_number || '-'}`} />
                      <ContractInfoRow label="เริ่มสัญญา" value={c.start_date ? new Date(c.start_date).toLocaleDateString('th-TH') : '-'} />
                      <ContractInfoRow label="สิ้นสุดสัญญา" value={c.end_date ? new Date(c.end_date).toLocaleDateString('th-TH') : '-'} />
                      <ContractInfoRow label="ค่าเช่ารายเดือน" value={`฿${Number(c.monthly_rent || 0).toLocaleString()}`} />
                      <ContractInfoRow label="เงินประกัน" value={`฿${Number(c.deposit_amount || 0).toLocaleString()}`} />
                      {settings && (
                        <>
                          <ContractInfoRow label="ค่าน้ำประปา" value={`${settings.waterRatePerUnit || '-'} ฿/หน่วย`} />
                          <ContractInfoRow label="ค่าไฟฟ้า" value={`${settings.electricRatePerUnit || '-'} ฿/หน่วย`} />
                          <ContractInfoRow label="ค่าปรับล่าช้า (ค่าเช่า)" value={`${settings.lateRentFine || '-'} ฿/วัน`} />
                          <ContractInfoRow label="ค่าปรับล่าช้า (น้ำไฟ)" value={`${settings.lateUtilityFine || '-'} ฿/วัน`} />
                        </>
                      )}

                      {docUrl && (
                        <TouchableOpacity
                          style={styles.docBtn}
                          onPress={() => {
                            setSelectedDoc(docUrl);
                            setDocLoading(true);
                            setDocError(false);
                          }}
                        >
                          <Ionicons name="document-text-outline" size={17} color="#7C3AED" />
                          <Text style={styles.docBtnText}>ดูเอกสารสัญญา</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })
              )}
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={() => { setSelected(null); setTenantContracts([]); setSelectedDoc(null); }}>
              <Text style={styles.closeText}>ปิด</Text>
            </TouchableOpacity>
          </View>
          </ScrollView>

          {/* Fullscreen Document Preview Overlay inside Modal */}
          {selectedDoc && (
            <View style={styles.docViewerOverlay}>
              <View style={styles.docModalHeader}>
                <Text style={styles.docModalTitle} numberOfLines={1}>เอกสารสัญญา</Text>
                <View style={styles.docHeaderActions}>
                  <TouchableOpacity 
                    onPress={() => Linking.openURL(selectedDoc)} 
                    style={styles.docActionBtn}
                    accessibilityLabel="เปิดในเบราว์เซอร์"
                  >
                    <Ionicons name="open-outline" size={20} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => setSelectedDoc(null)} 
                    style={styles.docCloseBtn}
                    accessibilityLabel="ปิด"
                  >
                    <Ionicons name="close" size={22} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.docModalContent}>
                {docLoading && (
                  <ActivityIndicator size="large" color="#3B82F6" style={StyleSheet.absoluteFill} />
                )}
                {docError ? (
                  <View style={styles.docErrorContainer}>
                    <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
                    <Text style={styles.docErrorText}>ไม่สามารถโหลดรูปภาพสัญญาได้</Text>
                    <TouchableOpacity
                      style={styles.openExternalBtn}
                      onPress={() => Linking.openURL(selectedDoc)}
                    >
                      <Ionicons name="open-outline" size={16} color="#fff" />
                      <Text style={styles.openExternalBtnText}>เปิดดูในเบราว์เซอร์</Text>
                    </TouchableOpacity>
                  </View>
                ) : selectedDoc.toLowerCase().includes('.pdf') ? (
                  <View style={styles.docPdfContainer}>
                    <Ionicons name="document-text" size={64} color="#EF4444" />
                    <Text style={styles.docPdfTitle}>เอกสารสัญญา (PDF)</Text>
                    <Text style={styles.docPdfSub}>กรุณาเปิดดูผ่านเบราว์เซอร์หรือแอปอ่าน PDF</Text>
                    <TouchableOpacity
                      style={styles.openExternalBtn}
                      onPress={() => Linking.openURL(selectedDoc)}
                    >
                      <Ionicons name="open-outline" size={18} color="#fff" />
                      <Text style={styles.openExternalBtnText}>เปิดเอกสาร PDF</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Image 
                    source={{ uri: selectedDoc }} 
                    style={styles.docImage}
                    resizeMode="contain"
                    onLoadStart={() => { setDocLoading(true); setDocError(false); }}
                    onLoadEnd={() => setDocLoading(false)}
                    onError={() => { setDocLoading(false); setDocError(true); }}
                  />
                )}
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* Fallback Standalone Modal if triggered outside selected tenant modal */}
      {!selected && !!selectedDoc && (
        <Modal visible={true} transparent animationType="fade" onRequestClose={() => setSelectedDoc(null)}>
          <View style={styles.docViewerOverlay}>
            <View style={styles.docModalHeader}>
              <Text style={styles.docModalTitle} numberOfLines={1}>เอกสารสัญญา</Text>
              <View style={styles.docHeaderActions}>
                <TouchableOpacity 
                  onPress={() => Linking.openURL(selectedDoc)} 
                  style={styles.docActionBtn}
                >
                  <Ionicons name="open-outline" size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSelectedDoc(null)} style={styles.docCloseBtn}>
                  <Ionicons name="close" size={22} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.docModalContent}>
              <Image 
                source={{ uri: selectedDoc }} 
                style={styles.docImage}
                resizeMode="contain"
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
      <Text style={{ width: 60, color: '#6B7280', fontSize: 13 }}>{label}</Text>
      <Text style={{ flex: 1, color: '#1F2937', fontSize: 13 }}>{value}</Text>
    </View>
  );
}

function ContractInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' }}>
      <Text style={{ color: '#6B7280', fontSize: 13 }}>{label}</Text>
      <Text style={{ color: '#1F2937', fontSize: 13, fontWeight: '500' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  searchRow: { padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  searchInput: {
    backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#1F2937',
  },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#DBEAFE', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarImageSmall: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E5E7EB', marginRight: 12 },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#1D4ED8' },
  name: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  username: { fontSize: 12, color: '#9CA3AF', marginTop: 1 },
  detailBtn: { paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#EFF6FF', borderRadius: 8 },
  detailText: { fontSize: 12, color: '#3B82F6', fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalName: { fontSize: 18, fontWeight: '800', color: '#1F2937' },
  modalUsername: { fontSize: 13, color: '#9CA3AF', marginBottom: 16 },
  infoGroup: { marginBottom: 8 },
  contractSection: { marginBottom: 16 },
  contractSectionTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 10 },
  noContract: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingVertical: 12 },
  contractCard: {
    backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  contractHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  contractNum: { fontSize: 13, fontWeight: '700', color: '#1F2937' },
  closeBtn: { backgroundColor: '#F3F4F6', borderRadius: 10, padding: 13, alignItems: 'center' },
  closeText: { color: '#374151', fontWeight: '600' },
  
  // Modal Avatar Styles
  modalHeaderContent: { alignItems: 'center', marginBottom: 16 },
  avatarContainer: { position: 'relative', marginBottom: 12 },
  avatarImage: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E5E7EB' },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#DBEAFE', justifyContent: 'center', alignItems: 'center' },
  avatarInitials: { fontSize: 24, fontWeight: '700', color: '#1D4ED8' },
  docBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3E8FF',
    paddingVertical: 9,
    borderRadius: 8,
    marginTop: 10,
    gap: 6,
  },
  docBtnText: {
    color: '#7C3AED',
    fontSize: 13,
    fontWeight: '700',
  },
  docViewerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0F172A',
    zIndex: 1000,
    elevation: 10,
  },
  docModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  docModalTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
  },
  docHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  docActionBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 8,
    borderRadius: 20,
  },
  docCloseBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 8,
    borderRadius: 20,
  },
  docModalContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  docImage: {
    width: '100%',
    height: '100%',
  },
  docErrorContainer: {
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  docErrorText: {
    color: '#94A3B8',
    fontSize: 15,
    textAlign: 'center',
  },
  docPdfContainer: {
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  docPdfTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
  },
  docPdfSub: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
  },
  openExternalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  openExternalBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
