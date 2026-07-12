import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { TouchableOpacity, Alert } from 'react-native';

export default function ExecutiveLayout() {
  const { logout } = useAuthStore();
  const handleLogout = () => Alert.alert('ออกจากระบบ', 'ต้องการออกจากระบบหรือไม่?', [
    { text: 'ยกเลิก', style: 'cancel' },
    { text: 'ออก', style: 'destructive', onPress: logout },
  ]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#059669',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F3F4F6', height: 60, paddingBottom: 8 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerStyle: { backgroundColor: '#059669' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        headerRight: () => (
          <TouchableOpacity onPress={handleLogout} style={{ marginRight: 16 }}>
            <Ionicons name="log-out-outline" size={24} color="#fff" />
          </TouchableOpacity>
        ),
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'ภาพรวม', tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart" size={size} color={color} />, headerTitle: 'รายงานผู้บริหาร' }} />
      <Tabs.Screen name="stalls" options={{ title: 'ล็อก', tabBarIcon: ({ color, size }) => <Ionicons name="storefront" size={size} color={color} />, headerTitle: 'สถานะล็อก' }} />
      <Tabs.Screen name="tenants" options={{ title: 'ผู้เช่า', tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />, headerTitle: 'ผู้เช่าทั้งหมด' }} />
      <Tabs.Screen name="bills" options={{ title: 'บิล', tabBarIcon: ({ color, size }) => <Ionicons name="receipt" size={size} color={color} />, headerTitle: 'สรุปบิล' }} />
      <Tabs.Screen name="repairs" options={{ title: 'ซ่อม', tabBarIcon: ({ color, size }) => <Ionicons name="construct" size={size} color={color} />, headerTitle: 'สรุปซ่อม' }} />
    </Tabs>
  );
}
