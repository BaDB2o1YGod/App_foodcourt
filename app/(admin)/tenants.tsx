import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Modal,
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
import { router } from 'expo-router';
import { contractsAPI, usersAPI } from '../../services/api';

export default function AdminTenants() {
  const [tenants, setTenants] = useState<any[]>([]);

  const formatName = (f?: string, l?: string) => {
    if (!f) return '';
    if (!l) return f;
    if (f.includes(l)) return f;
    return `${f} ${l}`;
  };
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [allContracts, setAllContracts] = useState<any[]>([]);
  const [tenantContracts, setTenantContracts] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      const [usersRes, contractsRes] = await Promise.all([
        usersAPI.getAll({ role: 'TENANT' }),
        contractsAPI.getAll(),
      ]);
      setTenants(usersRes.data.data || []);
      setAllContracts(contractsRes.data.data || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData().finally(() => setLoading(false)); }, []);

  const handleSelectTenant = (tenant: any) => {
    setSelected(tenant);
    // Filter contracts: match by tenant_id or nested tenant.user_id
    const matched = allContracts.filter(
      (c) => c.tenant_id === tenant.user_id || c.tenant?.user_id === tenant.user_id
    );
    setTenantContracts(matched);
  };

  const filtered = tenants.filter((t) =>
    `${t.first_name} ${t.last_name} ${t.username}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleDeactivate = (id: number, name: string) => {
    Alert.alert('ระงับบัญชี', `ต้องการระงับบัญชี ${name} หรือไม่?`, [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ระงับ', style: 'destructive', onPress: async () => {
          try {
            await usersAPI.deactivate(id);
            setSelected(null);
            await fetchData();
          } catch (e: any) {
            Alert.alert('ผิดพลาด', e?.response?.data?.message || 'ระงับบัญชีไม่สำเร็จ');
          }
        }
      },
    ]);
  };

  const handleDelete = (id: number, name: string) => {
    Alert.alert('ลบผู้ใช้', `ต้องการลบ ${name} หรือไม่?`, [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ลบ', style: 'destructive', onPress: async () => {
          try {
            await usersAPI.delete(id);
            await fetchData();
          } catch (e: any) {
            Alert.alert('ผิดพลาด', e?.response?.data?.message || 'ลบไม่สำเร็จ');
          }
        }
      },
    ]);
  };

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
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{t.first_name?.[0] || '?'}</Text>
              </View>
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
            <Text style={styles.modalName}>{formatName(selected?.first_name, selected?.last_name)}</Text>
            <Text style={styles.modalUsername}>@{selected?.username}</Text>
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
                tenantContracts.map((c) => (
                  <View key={c.contract_id} style={styles.contractCard}>
                    <View style={styles.contractHeader}>
                      <Text style={styles.contractNum}>สัญญา #{c.contract_number}</Text>
                      <StatusBadge status={c.status} size="sm" />
                    </View>
                    <InfoRow label="ล็อก" value={c.slot?.slot_number || '-'} />
                    <InfoRow label="เริ่มสัญญา" value={c.start_date ? new Date(c.start_date).toLocaleDateString('th-TH') : '-'} />
                    <InfoRow label="สิ้นสุด" value={c.end_date ? new Date(c.end_date).toLocaleDateString('th-TH') : '-'} />
                    <InfoRow label="ค่าเช่า/เดือน" value={`฿${Number(c.monthly_rent || 0).toLocaleString()}`} />
                    <InfoRow label="เงินมัดจำ" value={`฿${Number(c.deposit_amount || 0).toLocaleString()}`} />
                  </View>
                ))
              )}
            </View>

            <TouchableOpacity
              style={styles.deactivateBtn}
              onPress={() => handleDeactivate(selected.user_id, `${selected.first_name}`)}
            >
              <Text style={styles.deactivateText}>⚠️ ระงับบัญชีนี้</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => { setSelected(null); handleDelete(selected.user_id, `${selected.first_name}`); }}
            >
              <Text style={styles.deleteText}>ลบผู้ใช้นี้</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeBtn} onPress={() => { setSelected(null); setTenantContracts([]); }}>
              <Text style={styles.closeText}>ปิด</Text>
            </TouchableOpacity>
          </View>
          </ScrollView>
        </View>
      </Modal>

      {/* FAB — เพิ่มผู้เช่าใหม่ */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(admin)/create-tenant')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
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

const styles = StyleSheet.create({
  searchRow: { padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  searchInput: {
    backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#1F2937',
  },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#DBEAFE', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#1D4ED8' },
  name: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
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
  deleteBtn: { backgroundColor: '#FEE2E2', borderRadius: 10, padding: 13, alignItems: 'center', marginBottom: 10 },
  deleteText: { color: '#DC2626', fontWeight: '700' },
  deactivateBtn: { backgroundColor: '#FEF3C7', borderRadius: 10, padding: 13, alignItems: 'center', marginBottom: 10 },
  deactivateText: { color: '#D97706', fontWeight: '700' },
  closeBtn: { backgroundColor: '#F3F4F6', borderRadius: 10, padding: 13, alignItems: 'center' },
  closeText: { color: '#374151', fontWeight: '600' },
  fab: {
    position: 'absolute', right: 20, bottom: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#7C3AED', justifyContent: 'center', alignItems: 'center',
    elevation: 6, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8,
  },
});
