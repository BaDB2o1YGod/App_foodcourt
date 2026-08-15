import { useEffect, useState } from 'react';
import { Tabs, router, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { TouchableOpacity, Alert } from 'react-native';
import { billsAPI } from '../../services/api';

export default function TenantLayout() {
  const { logout, user } = useAuthStore();
  const [pendingCount, setPendingCount] = useState(0);
  const pathname = usePathname();

  // [S2] Client-side role guard
  useEffect(() => {
    if (user && user.role !== 'TENANT') {
      router.replace('/(auth)/login');
    }
  }, [user]);

  useEffect(() => {
    (async () => {
      try {
        const res = await billsAPI.getAll().catch(() => null);
        const allBills = res?.data?.data || [];
        const pending = allBills.filter((b: any) => {
          const isPendingStatus = b.status === 'PENDING' || b.status === 'OVERDUE';
          const hasUnverifiedPayment = b.payments?.some((p: any) => !p.verified_at);
          return isPendingStatus && !hasUnverifiedPayment;
        }).length;
        setPendingCount(pending);
      } catch (e) {
        console.warn(e);
      }
    })();
  }, [pathname]);

  const handleLogout = () => {
    Alert.alert('ออกจากระบบ', 'ต้องการออกจากระบบหรือไม่?', [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: 'ออกจากระบบ', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#80639A',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F3F4F6', height: 60, paddingBottom: 8 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerStyle: { backgroundColor: '#80639A' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        headerRight: () => (
          <TouchableOpacity onPress={handleLogout} style={{ marginRight: 16 }}>
            <Ionicons name="log-out-outline" size={24} color="#fff" />
          </TouchableOpacity>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'หน้าหลัก',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
          headerTitle: 'ศูนย์อาหารมหาวิทยาลัยราชภัฏบุรีรัมย์',
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: 'ค่าใช้จ่าย',
          tabBarIcon: ({ color, size }) => <Ionicons name="receipt" size={size} color={color} />,
          headerTitle: 'ค่าใช้จ่าย',
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
          tabBarBadgeStyle: { backgroundColor: '#EF4444', fontSize: 11, fontWeight: '700', minWidth: 20, height: 20, lineHeight: 20, borderRadius: 10 },
        }}
      />
      <Tabs.Screen
        name="report-repair"
        options={{
          title: 'แจ้งซ่อม',
          tabBarIcon: ({ color, size }) => <Ionicons name="construct" size={size} color={color} />,
          headerTitle: 'แจ้งซ่อม',
        }}
      />
      <Tabs.Screen
        name="contracts"
        options={{
          title: 'สัญญาเช่า',
          tabBarIcon: ({ color, size }) => <Ionicons name="document-text" size={size} color={color} />,
          headerTitle: 'สัญญาเช่า',
        }}
      />
      {/* Hidden screens - accessible via navigation only */}
      <Tabs.Screen name="upload-bill" options={{ href: null, headerTitle: 'อัปโหลดสลิป' }} />
      <Tabs.Screen name="payment-history" options={{ href: null, headerTitle: 'ประวัติการชำระเงิน' }} />
      <Tabs.Screen name="stall-status" options={{ href: null, headerTitle: 'สถานะล็อก' }} />
      <Tabs.Screen name="track-repairs" options={{ href: null, headerTitle: 'ติดตามการซ่อม' }} />
      <Tabs.Screen name="cancellation-form" options={{ href: null, headerTitle: 'ฟอร์มยกเลิกเช่า' }} />
    </Tabs>
  );
}
