import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { authAPI } from '../services/api';

export default function RootLayout() {
  const { isAuthenticated, isLoading, user, initAuth } = useAuthStore();
  const { expoPushToken } = usePushNotifications();

  useEffect(() => {
    initAuth();
  }, []);

  // Sync Push Token to Backend when user logs in and we have a token
  useEffect(() => {
    if (isAuthenticated && expoPushToken?.data) {
      alert('ได้ Push Token แล้ว! กำลังบันทึกลงฐานข้อมูล: ' + expoPushToken.data.substring(0, 20) + '...');
      console.log('[Push] Syncing token to backend:', expoPushToken.data);
      authAPI.updatePushToken(expoPushToken.data)
        .then(() => alert('บันทึก Token ลงฐานข้อมูลสำเร็จ!'))
        .catch(err => alert('[Push] Failed to sync token: ' + err.message));
    } else if (isAuthenticated && !expoPushToken) {
      console.log('[Push] expoPushToken is null or undefined');
    }
  }, [isAuthenticated, expoPushToken]);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace('/(auth)/login');
      return;
    }

    // Redirect based on role
    switch (user?.role) {
      case 'ADMIN':
        router.replace('/(admin)');
        break;
      case 'TENANT':
        router.replace('/(tenant)');
        break;
      case 'MAINTENANCE':
        router.replace('/(maintenance)');
        break;
      case 'EXECUTIVE':
        router.replace('/(executive)');
        break;
      default:
        router.replace('/(auth)/login');
    }
  }, [isAuthenticated, isLoading, user?.role]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#6B21A8' }}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tenant)" />
        <Stack.Screen name="(admin)" />
        <Stack.Screen name="(maintenance)" />
        <Stack.Screen name="(executive)" />
      </Stack>
    </>
  );
}
