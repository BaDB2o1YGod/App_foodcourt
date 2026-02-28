import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { TouchableOpacity, Alert } from 'react-native';

export default function MaintenanceLayout() {
  const { logout } = useAuthStore();
  const handleLogout = () => Alert.alert('ออกจากระบบ', 'ต้องการออกจากระบบหรือไม่?', [
    { text: 'ยกเลิก', style: 'cancel' },
    { text: 'ออก', style: 'destructive', onPress: logout },
  ]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#F59E0B',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F3F4F6', height: 60, paddingBottom: 8 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerStyle: { backgroundColor: '#F59E0B' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        headerRight: () => (
          <TouchableOpacity onPress={handleLogout} style={{ marginRight: 16 }}>
            <Ionicons name="log-out-outline" size={24} color="#fff" />
          </TouchableOpacity>
        ),
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'หน้าหลัก', tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />, headerTitle: '🔧 ช่างซ่อม' }} />
      <Tabs.Screen name="jobs" options={{ title: 'งานทั้งหมด', tabBarIcon: ({ color, size }) => <Ionicons name="list" size={size} color={color} />, headerTitle: 'รายการงาน' }} />
      <Tabs.Screen name="job-detail" options={{ href: null, headerTitle: 'รายละเอียดงาน' }} />
    </Tabs>
  );
}
