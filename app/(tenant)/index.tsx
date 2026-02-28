import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { stallsAPI, billsAPI } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const QUICK_MENU = [
  { icon: 'receipt', label: 'ค่าใช้จ่าย', route: '/(tenant)/expenses', color: '#F97316', bg: '#FFF7ED' },
  { icon: 'document-text', label: 'สัญญาเช่า', route: '/(tenant)/contracts', color: '#3B82F6', bg: '#EFF6FF' },
  { icon: 'cloud-upload', label: 'อัปโหลดบิล', route: '/(tenant)/upload-bill', color: '#10B981', bg: '#ECFDF5' },
  { icon: 'time', label: 'ประวัติชำระ', route: '/(tenant)/payment-history', color: '#8B5CF6', bg: '#F5F3FF' },
  { icon: 'construct', label: 'แจ้งซ่อม', route: '/(tenant)/report-repair', color: '#EF4444', bg: '#FEF2F2' },
  { icon: 'clipboard', label: 'ติดตามซ่อม', route: '/(tenant)/track-repairs', color: '#6B7280', bg: '#F9FAFB' },
  { icon: 'restaurant', label: 'ถ้วยชาม', route: '/(tenant)/dishware', color: '#F59E0B', bg: '#FFFBEB' },
];

export default function TenantDashboard() {
  const { user } = useAuthStore();
  const [stall, setStall] = useState<any>(null);
  const [dueBills, setDueBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!useAuthStore.getState().isAuthenticated) return;
      try {
        const [stallsRes, billsRes] = await Promise.all([
          stallsAPI.getAll().catch(() => null),
          billsAPI.getDueBills().catch(() => null),
        ]);
        if (!stallsRes && !billsRes) throw new Error('Network error');
        setStall(stallsRes?.data?.data?.[0] || null);
        setDueBills(billsRes?.data?.data || []);
      } catch (e) {
        console.warn(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoadingSpinner message="กำลังโหลด..." />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* Welcome Banner */}
      <View style={styles.banner}>
        <Text style={styles.bannerGreet}>สวัสดี 👋</Text>
        <Text style={styles.bannerName}>{user?.first_name} {user?.last_name}</Text>
        {stall && (
          <View style={styles.stallBadge}>
            <Ionicons name="storefront" size={16} color="#7C3AED" />
            <Text style={styles.stallText}>ล็อก {stall.slot_number} — ศูนย์อาหาร {stall.food_court_id}</Text>
          </View>
        )}
      </View>

      {/* Due Bills Alert */}
      {dueBills.length > 0 && (
        <View style={styles.alertBox}>
          <Ionicons name="warning" size={20} color="#B45309" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.alertTitle}>มีบิลค้างชำระ {dueBills.length} รายการ</Text>
            <Text style={styles.alertSub}>ภายใน 7 วันข้างหน้า</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tenant)/payment-history')}>
            <Text style={styles.alertLink}>ชำระ →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Food Court Cards */}
      <Text style={styles.sectionLabel}>ศูนย์อาหาร</Text>
      <View style={styles.courtRow}>
        {[1, 2].map((fc) => (
          <TouchableOpacity
            key={fc}
            style={styles.courtCard}
            onPress={() => router.push(`/(tenant)/stall-status?foodCourt=${fc}` as any)}
          >
            <View style={[styles.courtImg, { backgroundColor: fc === 1 ? '#EDE9FE' : '#DBEAFE' }]}>
              <Text style={styles.courtEmoji}>{fc === 1 ? '🏪' : '🍜'}</Text>
            </View>
            <Text style={styles.courtName}>ศูนย์อาหาร {fc}</Text>
            <Text style={styles.courtSub}>ดูแผนที่ล็อก →</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Quick Menu */}
      <Text style={styles.sectionLabel}>เมนูด่วน</Text>
      <View style={styles.grid}>
        {QUICK_MENU.map((item) => (
          <TouchableOpacity
            key={item.label}
            style={styles.menuItem}
            onPress={() => router.push(item.route as any)}
          >
            <View style={[styles.menuIcon, { backgroundColor: item.bg }]}>
              <Ionicons name={item.icon as any} size={26} color={item.color} />
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  banner: {
    backgroundColor: '#7C3AED', padding: 24, paddingTop: 32,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
  },
  bannerGreet: { color: 'rgba(255,255,255,0.75)', fontSize: 14 },
  bannerName: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 2, marginBottom: 10 },
  stallBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff', alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99,
  },
  stallText: { fontSize: 13, color: '#7C3AED', fontWeight: '600' },
  alertBox: {
    margin: 16, padding: 14, backgroundColor: '#FEF3C7', borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', borderLeftWidth: 4, borderLeftColor: '#F59E0B',
  },
  alertTitle: { fontWeight: '700', color: '#92400E' },
  alertSub: { fontSize: 12, color: '#B45309', marginTop: 1 },
  alertLink: { color: '#7C3AED', fontWeight: '700', fontSize: 14 },
  sectionLabel: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginHorizontal: 16, marginTop: 20, marginBottom: 10 },
  courtRow: { flexDirection: 'row', gap: 12, marginHorizontal: 16 },
  courtCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  courtImg: { height: 90, justifyContent: 'center', alignItems: 'center' },
  courtEmoji: { fontSize: 40 },
  courtName: { fontWeight: '700', color: '#1F2937', padding: 10, paddingBottom: 2 },
  courtSub: { fontSize: 12, color: '#7C3AED', paddingHorizontal: 10, paddingBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, gap: 8 },
  menuItem: {
    width: '30%', marginHorizontal: '1.5%', backgroundColor: '#fff', borderRadius: 16,
    padding: 14, alignItems: 'center', gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  menuIcon: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { fontSize: 12, fontWeight: '600', color: '#374151', textAlign: 'center' },
});
