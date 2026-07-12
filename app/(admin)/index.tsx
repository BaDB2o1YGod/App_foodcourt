import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Image } from 'react-native';
import { router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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
    { icon: 'receipt', label: 'จัดการบิล', route: '/(admin)/bills', color: '#8B5CF6', bg: '#F5F3FF' },
    { icon: 'invoice-text-send', family: 'MaterialCommunityIcons', label: 'ออกบิลรายเดือน', route: '/(admin)/meter-recording', color: '#ffc400ff', bg: '#F5F3FF' },
    { icon: 'restaurant', label: 'ภาชนะ', route: '/(admin)/dishware', color: '#F97316', bg: '#FFF7ED' },
    { icon: 'bar-chart', label: 'รายงาน', route: '/(admin)/reports', color: '#6366F1', bg: '#EEF2FF' },
    { icon: 'construct', label: 'ซ่อม', route: '/(admin)/repairs', color: '#EF4444', bg: '#FEF2F2' },
    { icon: 'settings', label: 'ตั้งค่า', route: '/(admin)/settings', color: '#6B7280', bg: '#F9FAFB' },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greet}>ยินดีต้อนรับคุณ, {user?.first_name}</Text>
            <Text style={styles.role}>ผู้ดูแลระบบ</Text>
          </View>
          <Image
            source={require('../../assets/images/bru-logo.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsGrid}>
        <StatCard label="ล็อกทั้งหมด" value={stats.stalls} icon="storefront" color="#3B82F6" />
        <StatCard label="มีผู้เช่า" value={stats.occupied} icon="people" color="#10B981" />
        <StatCard label="บิลรอชำระ" value={stats.pending} icon="receipt" color="#F59E0B" badge={stats.pending} onPress={() => router.push({ pathname: '/(admin)/bills', params: { filter: 'PENDING' } })} />
        <StatCard label="รอซ่อม" value={stats.repairs} icon="construct" color="#EF4444" />
      </View>

      {/* Food Court Cards */}
      <Text style={styles.menuLabel}>ศูนย์อาหาร</Text>
      <View style={styles.courtRow}>
        {[1, 2].map((fc) => (
          <TouchableOpacity
            key={fc}
            style={styles.courtCard}
            onPress={() => router.push({ pathname: '/(admin)/stalls', params: { food_court_id: fc } })}
          >
            <View style={[styles.courtImg, { backgroundColor: fc === 1 ? '#EDE9FE' : '#DBEAFE' }]}>
              {fc === 1 ? (
                <Image
                  source={require('../../assets/images/Food_center1.jpg')}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              ) : fc === 2 ? (
                <Image
                  source={require('../../assets/images/Food_center2.jpg')}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.courtEmoji}>🏪</Text>
              )}
            </View>
            <Text style={styles.courtName}>ศูนย์อาหาร {fc}</Text>
            <Text style={styles.courtSub}>ดูแผนที่ล็อก →</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Menu */}
      <Text style={styles.menuLabel}>เมนู</Text>
      <View style={styles.grid}>
        {ADMIN_MENU.map((item) => (
          <TouchableOpacity key={item.label} style={styles.menuItem} onPress={() => router.push(item.route as any)}>
            <View style={[styles.menuIcon, { backgroundColor: item.bg }]}>
              {item.family === 'MaterialCommunityIcons' ? (
                <MaterialCommunityIcons name={item.icon as any} size={26} color={item.color} />
              ) : (
                <Ionicons name={item.icon as any} size={26} color={item.color} />
              )}
            </View>
            <Text style={styles.menuLabel2}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

function StatCard({ label, value, icon, color, badge, onPress }: { label: string; value: number; icon: string; color: string; badge?: number; onPress?: () => void }) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper style={[styles.statCard, { borderTopColor: color }]} onPress={onPress} activeOpacity={0.7}>
      {badge !== undefined && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      )}
      <Ionicons name={icon as any} size={20} color={color} />
      <Text style={[styles.statVal, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { backgroundColor: '#80639A', padding: 24, paddingTop: 28 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLogo: { width: 72, height: 72 },
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
  badge: {
    position: 'absolute', top: -6, right: -6, backgroundColor: '#EF4444', borderRadius: 12,
    minWidth: 22, height: 22, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5,
    borderWidth: 2, borderColor: '#fff', zIndex: 10,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  menuLabel: { fontSize: 15, fontWeight: '700', color: '#374151', marginHorizontal: 16, marginTop: 4, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingBottom: 24 },
  menuItem: {
    width: '31.33%', marginHorizontal: '1%', marginBottom: 16, backgroundColor: '#fff', borderRadius: 14, padding: 12, alignItems: 'center', gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  menuIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  menuLabel2: { fontSize: 11, fontWeight: '600', color: '#374151', textAlign: 'center' },
  courtRow: { flexDirection: 'row', gap: 12, marginHorizontal: 16 },
  courtCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  courtImg: { height: 90, justifyContent: 'center', alignItems: 'center' },
  courtEmoji: { fontSize: 40 },
  courtName: { fontWeight: '700', color: '#1F2937', padding: 10, paddingBottom: 2 },
  courtSub: { fontSize: 12, color: '#7C3AED', paddingHorizontal: 10, paddingBottom: 10 },
  // Error state
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: '#F3F4F6' },
  errorIcon: { fontSize: 56, marginBottom: 16 },
  errorTitle: { fontSize: 18, fontWeight: '800', color: '#1F2937', marginBottom: 8, textAlign: 'center' },
  errorSub: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  retryBtn: { backgroundColor: '#DC2626', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

