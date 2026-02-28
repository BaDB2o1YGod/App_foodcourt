import { useEffect } from 'react';
import { router } from 'expo-router';

// Simple redirect — use login page instead
export default function Register() {
  useEffect(() => {
    router.replace('/(auth)/login');
  }, []);
  return null;
}
