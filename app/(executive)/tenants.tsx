import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput } from 'react-native';
import { usersAPI } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function ExecutiveTenants() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      try { const res = await usersAPI.getAll({ role: 'TENANT' }); setTenants(res.data.data || []); }
      catch (e) { console.error(e); } finally { setLoading(false); }
    })();
  }, []);

  const filtered = tenants.filter((t) =>
    `${t.first_name} ${t.last_name} ${t.username}`.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <LoadingSpinner />;

  return (
    <View style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
      <View style={styles.searchBox}>
        <TextInput style={styles.search} placeholder="🔍 ค้นหา..." placeholderTextColor="#9CA3AF" value={search} onChangeText={setSearch} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {filtered.map((t) => (
          <View key={t.user_id} style={styles.card}>
            <View style={styles.row}>
              <View style={styles.avatar}><Text style={styles.avatarTxt}>{t.first_name?.[0]}</Text></View>
              <View>
                <Text style={styles.name}>{t.first_name} {t.last_name}</Text>
                <Text style={styles.username}>@{t.username}{t.phone ? ` • ${t.phone}` : ''}</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  searchBox: { padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  search: { backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#1F2937' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center' },
  avatarTxt: { fontSize: 16, fontWeight: '700', color: '#059669' },
  name: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  username: { fontSize: 12, color: '#9CA3AF', marginTop: 1 },
});
