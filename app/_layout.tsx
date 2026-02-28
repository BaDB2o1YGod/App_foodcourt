import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../store/authStore';

export default function RootLayout() {
  const { isAuthenticated, isLoading, user, initAuth } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, []);

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
