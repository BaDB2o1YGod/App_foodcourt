import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { TouchableOpacity, Alert } from 'react-native';

export default function TenantLayout() {
  const { logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('ออกจากระบบ', 'ต้องการออกจากระบบหรือไม่?', [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: 'ออกจากระบบ', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#7C3AED',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F3F4F6', height: 60, paddingBottom: 8 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerStyle: { backgroundColor: '#7C3AED' },
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
          headerTitle: '🍽 BRU ศูนย์อาหาร',
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: 'ค่าใช้จ่าย',
          tabBarIcon: ({ color, size }) => <Ionicons name="receipt" size={size} color={color} />,
          headerTitle: 'ค่าใช้จ่าย',
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
        name="dishware"
        options={{
          title: 'ภาชนะ',
          tabBarIcon: ({ color, size }) => <Ionicons name="restaurant" size={size} color={color} />,
          headerTitle: 'สั่งซื้อภาชนะ',
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
    </Tabs>
  );
}
