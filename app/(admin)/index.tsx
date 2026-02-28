import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { stallsAPI, billsAPI, maintenanceAPI } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useAuthStore } from '../../store/authStore';

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({ stalls: 0, occupied: 0, pending: 0, repairs: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    if (!useAuthStore.getState().isAuthenticated) return;
    setError(false);
    try {
      const [stallsRes, billsRes, repairsRes] = await Promise.all([
        stallsAPI.getAll().catch(() => null),
        billsAPI.getAll({ status: 'PENDING' }).catch(() => null),
        maintenanceAPI.getAll({ status: 'PENDING' }).catch(() => null),
      ]);
      if (!stallsRes && !billsRes && !repairsRes) throw new Error('Network Error');
      const stallsData = stallsRes?.data?.data || [];
      setStats({
        stalls: stallsData.length,
        occupied: stallsData.filter((s: any) => s.status === 'OCCUPIED').length,
        pending: billsRes?.data?.data?.length || 0,
        repairs: repairsRes?.data?.data?.length || 0,
      });
    } catch (e) {
      console.warn(e);
      setError(true);
    }
  };

  useEffect(() => { fetchData().finally(() => setLoading(false)); }, []);

  if (loading) return <LoadingSpinner message="กำลังเชื่อมต่อ server..." />;

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>📡</Text>
        <Text style={styles.errorTitle}>เชื่อมต่อ Server ไม่ได้</Text>
        <Text style={styles.errorSub}>กรุณาตรวจสอบว่า Pro-66 server{'\n'}กำลังรันอยู่ที่ 192.168.1.126:3000</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); fetchData().finally(() => setLoading(false)); }}>
          <Text style={styles.retryText}>🔄 ลองอีกครั้ง</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const ADMIN_MENU = [
    { icon: 'people', label: 'ผู้เช่า', route: '/(admin)/tenants', color: '#3B82F6', bg: '#EFF6FF' },
    { icon: 'storefront', label: 'ล็อก', route: '/(admin)/stalls', color: '#10B981', bg: '#ECFDF5' },
    { icon: 'flash', label: 'บันทึกมิเตอร์', route: '/(admin)/meter-recording', color: '#F59E0B', bg: '#FFFBEB' },
    { icon: 'receipt', label: 'บิล', route: '/(admin)/bills', color: '#8B5CF6', bg: '#F5F3FF' },
    { icon: 'restaurant', label: 'ภาชนะ', route: '/(admin)/dishware', color: '#F97316', bg: '#FFF7ED' },
    { icon: 'bar-chart', label: 'รายงาน', route: '/(admin)/reports', color: '#6366F1', bg: '#EEF2FF' },
    { icon: 'construct', label: 'ซ่อม', route: '/(admin)/repairs', color: '#EF4444', bg: '#FEF2F2' },
    { icon: 'settings', label: 'ตั้งค่า', route: '/(admin)/settings', color: '#6B7280', bg: '#F9FAFB' },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greet}>ยินดีต้อนรับ, {user?.first_name}</Text>
        <Text style={styles.role}>ผู้ดูแลระบบ</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsGrid}>
        <StatCard label="ล็อกทั้งหมด" value={stats.stalls} icon="storefront" color="#3B82F6" />
        <StatCard label="มีผู้เช่า" value={stats.occupied} icon="people" color="#10B981" />
        <StatCard label="บิลรอชำระ" value={stats.pending} icon="receipt" color="#F59E0B" />
        <StatCard label="รอซ่อม" value={stats.repairs} icon="construct" color="#EF4444" />
      </View>

      {/* Menu */}
      <Text style={styles.menuLabel}>เมนู</Text>
      <View style={styles.grid}>
        {ADMIN_MENU.map((item) => (
          <TouchableOpacity key={item.label} style={styles.menuItem} onPress={() => router.push(item.route as any)}>
            <View style={[styles.menuIcon, { backgroundColor: item.bg }]}>
              <Ionicons name={item.icon as any} size={26} color={item.color} />
            </View>
            <Text style={styles.menuLabel2}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <Ionicons name={icon as any} size={20} color={color} />
      <Text style={[styles.statVal, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { backgroundColor: '#DC2626', padding: 24, paddingTop: 28, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  greet: { color: '#fff', fontSize: 20, fontWeight: '800' },
  role: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 10 },
  statCard: {
    flex: 1, minWidth: '45%', backgroundColor: '#fff', borderRadius: 14, padding: 14, alignItems: 'center', gap: 4,
    borderTopWidth: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  statVal: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 12, color: '#6B7280', textAlign: 'center' },
  menuLabel: { fontSize: 15, fontWeight: '700', color: '#374151', marginHorizontal: 16, marginTop: 4, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, gap: 8, paddingBottom: 24 },
  menuItem: {
    width: '22%', marginHorizontal: '1.5%', backgroundColor: '#fff', borderRadius: 14, padding: 12, alignItems: 'center', gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  menuIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  menuLabel2: { fontSize: 11, fontWeight: '600', color: '#374151', textAlign: 'center' },
  // Error state
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: '#F3F4F6' },
  errorIcon: { fontSize: 56, marginBottom: 16 },
  errorTitle: { fontSize: 18, fontWeight: '800', color: '#1F2937', marginBottom: 8, textAlign: 'center' },
  errorSub: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  retryBtn: { backgroundColor: '#DC2626', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

