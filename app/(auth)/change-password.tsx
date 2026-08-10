import { useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { router } from 'expo-router';
import { Entypo, Ionicons } from '@expo/vector-icons';
import { authAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

export default function ChangePasswordScreen() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user, setAuth, token } = useAuthStore();

  const handleSubmit = async () => {
    if (newPassword.length < 6) {
      Alert.alert('แจ้งเตือน', 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('แจ้งเตือน', 'รหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง');
      return;
    }

    setLoading(true);
    try {
      await authAPI.changePassword(newPassword);

      // อัปเดต user store ให้ must_change_password = false
      if (user && token) {
        setAuth({ ...user, must_change_password: false }, token);
      }

      Alert.alert('สำเร็จ', 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว', [
        {
          text: 'ตกลง',
          onPress: () => {
            // Redirect ตาม role
            switch (user?.role) {
              case 'ADMIN': router.replace('/(admin)'); break;
              case 'TENANT': router.replace('/(tenant)'); break;
              case 'MAINTENANCE': router.replace('/(maintenance)'); break;
              case 'EXECUTIVE': router.replace('/(executive)'); break;
              default: router.replace('/'); break;
            }
          }
        }
      ]);
    } catch (e: any) {
      Alert.alert('ผิดพลาด', e?.response?.data?.message || 'ไม่สามารถเปลี่ยนรหัสผ่านได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>

        {/* Icon */}
        <View style={styles.iconWrap}>
          <Ionicons name="lock-closed" size={44} color="#7C3AED" />
        </View>

        <Text style={styles.title}>ตั้งรหัสผ่านใหม่</Text>
        <Text style={styles.subtitle}>
          เนื่องจากคุณล็อกอินครั้งแรก{'\n'}กรุณาตั้งรหัสผ่านส่วนตัวของคุณ
        </Text>

        {/* New Password */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>รหัสผ่านใหม่</Text>
          <View style={styles.passRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="อย่างน้อย 6 ตัวอักษร"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showNew}
              value={newPassword}
              onChangeText={setNewPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowNew(!showNew)} style={styles.eyeBtn}>
              <Entypo name={showNew ? 'eye-with-line' : 'eye'} size={20} color="#374151" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Confirm Password */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>ยืนยันรหัสผ่าน</Text>
          <View style={styles.passRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="กรอกรหัสผ่านอีกครั้ง"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showConfirm}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
              <Entypo name={showConfirm ? 'eye-with-line' : 'eye'} size={20} color="#374151" />
            </TouchableOpacity>
          </View>
          {confirmPassword.length > 0 && newPassword !== confirmPassword && (
            <Text style={styles.errorText}>รหัสผ่านไม่ตรงกัน</Text>
          )}
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, loading && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.submitText}>ยืนยันรหัสผ่าน</Text>
          }
        </TouchableOpacity>

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#6B21A8' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  iconWrap: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
    alignSelf: 'center', marginBottom: 20,
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 10,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.75)', textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.9)', marginBottom: 8 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.95)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 15, color: '#1F2937',
  },
  passRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn: {
    width: 48, height: 48, backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 12, justifyContent: 'center', alignItems: 'center',
  },
  errorText: { fontSize: 12, color: '#FCA5A5', marginTop: 4 },
  submitBtn: {
    backgroundColor: '#fff', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },
  submitText: { color: '#7C3AED', fontSize: 16, fontWeight: '800' },
});
