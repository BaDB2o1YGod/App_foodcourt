import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Modal, TextInput, RefreshControl,
} from 'react-native';
import { usersAPI } from '../../services/api';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function AdminTenants() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);

  const fetchData = async () => {
    try {
      const res = await usersAPI.getAll({ role: 'TENANT' });
      setTenants(res.data.data || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData().finally(() => setLoading(false)); }, []);

  const filtered = tenants.filter((t) =>
    `${t.first_name} ${t.last_name} ${t.username}`.toLowerCase().includes(search.toLowerCase())
  );

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
                <Text style={styles.name}>{t.first_name} {t.last_name}</Text>
                <Text style={styles.username}>@{t.username}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelected(t)} style={styles.detailBtn}>
                <Text style={styles.detailText}>รายละเอียด</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Detail Modal */}
      <Modal visible={!!selected} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalName}>{selected?.first_name} {selected?.last_name}</Text>
            <Text style={styles.modalUsername}>@{selected?.username}</Text>
            <View style={styles.infoGroup}>
              {selected?.phone && <InfoRow label="โทร" value={selected.phone} />}
              {selected?.email && <InfoRow label="อีเมล" value={selected.email} />}
              {selected?.address_line && <InfoRow label="ที่อยู่" value={selected.address_line} />}
            </View>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => { setSelected(null); handleDelete(selected.user_id, `${selected.first_name}`); }}
            >
              <Text style={styles.deleteText}>🗑 ลบผู้ใช้นี้</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelected(null)}>
              <Text style={styles.closeText}>ปิด</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalName: { fontSize: 18, fontWeight: '800', color: '#1F2937' },
  modalUsername: { fontSize: 13, color: '#9CA3AF', marginBottom: 16 },
  infoGroup: { marginBottom: 16 },
  deleteBtn: { backgroundColor: '#FEE2E2', borderRadius: 10, padding: 13, alignItems: 'center', marginBottom: 10 },
  deleteText: { color: '#DC2626', fontWeight: '700' },
  closeBtn: { backgroundColor: '#F3F4F6', borderRadius: 10, padding: 13, alignItems: 'center' },
  closeText: { color: '#374151', fontWeight: '600' },
});
