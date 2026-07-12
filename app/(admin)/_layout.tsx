import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Alert, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../../store/authStore';

export default function AdminLayout() {
  const { logout } = useAuthStore();
  const handleLogout = () => Alert.alert('ออกจากระบบ', 'ต้องการออกจากระบบหรือไม่?', [
    { text: 'ยกเลิก', style: 'cancel' },
    { text: 'ออก', style: 'destructive', onPress: logout },
  ]);

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
      <Tabs.Screen name="index" options={{ title: 'หน้าหลัก', tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />, headerTitle: 'ผู้ดูแลระบบ' }} />
      <Tabs.Screen name="tenants" options={{ title: 'ผู้เช่า', tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />, headerTitle: 'จัดการผู้เช่า' }} />
      <Tabs.Screen name="repairs" options={{ title: 'ซ่อม', tabBarIcon: ({ color, size }) => <Ionicons name="construct" size={size} color={color} />, headerTitle: 'จัดการซ่อม' }} />
      <Tabs.Screen name="bills" options={{ title: 'จัดการบิล', tabBarIcon: ({ color, size }) => <Ionicons name="receipt" size={size} color={color} />, headerTitle: 'จัดการบิล' }} />
      <Tabs.Screen name="stalls" options={{ title: 'ล็อก', tabBarIcon: ({ color, size }) => <Ionicons name="storefront" size={size} color={color} />, headerTitle: 'จัดการล็อก' }} />
      <Tabs.Screen name="meter-recording" options={{ href: null, headerTitle: 'บันทึกมิเตอร์' }} />
      <Tabs.Screen name="monthly-billing" options={{ href: null, headerTitle: 'ออกบิลรายเดือน' }} />
      <Tabs.Screen name="dishware" options={{ href: null, headerTitle: 'คำสั่งซื้อภาชนะ' }} />
      <Tabs.Screen name="reports" options={{ href: null, headerTitle: 'รายงาน' }} />
      <Tabs.Screen name="settings" options={{ href: null, headerTitle: 'ตั้งค่าระบบ' }} />
    </Tabs>
  );
}
