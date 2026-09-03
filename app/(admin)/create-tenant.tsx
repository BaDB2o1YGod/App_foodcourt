import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView,
  Modal, Platform, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View, Keyboard, TouchableWithoutFeedback, Image
} from 'react-native';
import * as ExpoClipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { usersAPI, shopTypesAPI } from '../../services/api';

interface ShopType {
  shop_type_id: number;
  type_name: string;
  require_grease_trap: boolean;
}

// ─── ข้อมูลคำนำหน้า ────────────────────────────────────
const TITLE_OPTIONS = ['นาย', 'นาง', 'นางสาว'];

import { ADDRESS_DATA } from '../../constants/AddressData';

const PROVINCES = Object.keys(ADDRESS_DATA).sort((a, b) => a.localeCompare(b, 'th'));

export default function CreateTenantScreen() {
  const [loading, setLoading] = useState(false);
  const [shopTypes, setShopTypes] = useState<ShopType[]>([]);
  const [createdCredentials, setCreatedCredentials] = useState<{ username: string; temp_password: string } | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [subdistrict, setSubdistrict] = useState('');
  const [selectedShopType, setSelectedShopType] = useState<number | null>(null);
  
  const [profileImage, setProfileImage] = useState<string | null>(null);

  // Dropdown modal
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [dropdownTitle, setDropdownTitle] = useState('');
  const [dropdownOptions, setDropdownOptions] = useState<string[]>([]);
  const [dropdownCallback, setDropdownCallback] = useState<((val: string) => void) | null>(null);
  const [dropdownSearch, setDropdownSearch] = useState('');

  useEffect(() => {
    shopTypesAPI.getAll()
      .then((res) => setShopTypes(res.data.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (username.length < 3) {
      setUsernameError('');
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await usersAPI.getAll({ search: username });
        const exists = res.data.data.some((u: any) => u.username.toLowerCase() === username.toLowerCase());
        if (exists) {
          setUsernameError('Username นี้ถูกใช้งานแล้ว');
        } else {
          setUsernameError('');
        }
      } catch (e) {
        // Ignore
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [username]);

  const openDropdown = (ddTitle: string, options: string[], callback: (val: string) => void) => {
    setDropdownTitle(ddTitle);
    setDropdownOptions(options);
    setDropdownCallback(() => callback);
    setDropdownSearch('');
    setDropdownVisible(true);
  };

  const selectDropdownItem = (item: string) => {
    if (dropdownCallback) dropdownCallback(item);
    setDropdownVisible(false);
  };

  // Derived options
  const districtOptions = province && ADDRESS_DATA[province] 
    ? Object.keys(ADDRESS_DATA[province]).sort((a, b) => a.localeCompare(b, 'th')) 
    : [];
  const subdistrictOptions = province && district && ADDRESS_DATA[province]?.[district] 
    ? [...ADDRESS_DATA[province][district]].sort((a, b) => a.localeCompare(b, 'th')) 
    : [];

  const handleCreate = async () => {
    if (!firstName.trim() || !username.trim()) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกชื่อ และ Username');
      return;
    }

    if (usernameError) {
      Alert.alert('แจ้งเตือน', 'Username นี้ถูกใช้งานแล้ว โปรดเปลี่ยนใหม่');
      return;
    }

    // [S6] Validate email format (if provided)
    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        Alert.alert('แจ้งเตือน', 'รูปแบบอีเมลไม่ถูกต้อง');
        return;
      }
    }

    // [S6] Validate phone format (if provided) — เบอร์โทรศัพท์ไทย 9-10 หลัก
    if (phone.trim()) {
      const phoneRegex = /^0\d{8,9}$/;
      if (!phoneRegex.test(phone.trim())) {
        Alert.alert('แจ้งเตือน', 'เบอร์โทรศัพท์ไม่ถูกต้อง (ตัวอย่าง: 0812345678)');
        return;
      }
    }

    setLoading(true);
    try {
      const tempPassword = Math.random().toString(36).slice(-8);

      let submitData: any = {
        title: title || undefined,
        first_name: firstName.trim(),
        last_name: lastName.trim() || undefined,
        username: username.trim(),
        password: tempPassword,
        role: 'TENANT',
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address_line: addressLine.trim() || undefined,
        province: province || undefined,
        district: district || undefined,
        subdistrict: subdistrict || undefined,
      };

      if (profileImage) {
        const formData = new FormData();
        Object.keys(submitData).forEach((key) => {
          if (submitData[key] !== undefined) {
            formData.append(key, submitData[key]);
          }
        });
        
        const ext = profileImage.split('.').pop()?.toLowerCase() || 'jpg';
        const mimeMap: Record<string, string> = {
          jpg: 'image/jpeg',
          jpeg: 'image/jpeg',
          png: 'image/png',
          gif: 'image/gif',
          webp: 'image/webp',
          heic: 'image/heic',
        };
        const mimeType = mimeMap[ext] || 'image/jpeg';
        
        formData.append('profileImage', {
          uri: profileImage,
          name: `profile.${ext}`,
          type: mimeType,
        } as any);
        
        submitData = formData;
      }

      const res = await usersAPI.createTenant(submitData);

      const user = res.data.data || res.data.user || submitData;
      setCreatedCredentials({ username: user.username || username, temp_password: tempPassword });
    } catch (e: any) {
      Alert.alert('ผิดพลาด', e?.response?.data?.message || 'ไม่สามารถสร้างบัญชีได้');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text: string) => {
    await ExpoClipboard.setStringAsync(text);
    Alert.alert('คัดลอกแล้ว', `"${text}" ถูกคัดลอกไปยัง Clipboard แล้ว`);
  };

  const filteredDropdownOptions = dropdownSearch
    ? dropdownOptions.filter((o) => o.includes(dropdownSearch))
    : dropdownOptions;

  // ─── Success Screen ───────────────────────────────────
  if (createdCredentials) {
    return (
      <View style={styles.container}>
        <View style={styles.successCard}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={56} color="#059669" />
          </View>
          <Text style={styles.successTitle}>สร้างบัญชีสำเร็จ!</Text>
          <Text style={styles.successSub}>ส่ง Credential ด้านล่างให้ผู้เช่าใหม่ครับ</Text>

          <View style={styles.credBox}>
            <Text style={styles.credLabel}>Username</Text>
            <TouchableOpacity style={styles.credRow} onPress={() => handleCopy(createdCredentials.username)}>
              <Text style={styles.credValue}>{createdCredentials.username}</Text>
              <Ionicons name="copy-outline" size={16} color="#7C3AED" />
            </TouchableOpacity>
          </View>

          <View style={styles.credBox}>
            <Text style={styles.credLabel}>รหัสผ่านชั่วคราว</Text>
            <TouchableOpacity style={styles.credRow} onPress={() => handleCopy(createdCredentials.temp_password)}>
              <Text style={[styles.credValue, { letterSpacing: 2 }]}>{createdCredentials.temp_password}</Text>
              <Ionicons name="copy-outline" size={16} color="#7C3AED" />
            </TouchableOpacity>
          </View>

          <Text style={styles.credNote}>⚠️ ผู้เช่าจะต้องเปลี่ยนรหัสผ่านเมื่อล็อกอินครั้งแรก</Text>

          <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
            <Text style={styles.doneBtnText}>เสร็จสิ้น</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Form Screen ──────────────────────────────────────
  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>เพิ่มผู้เช่าใหม่</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Form */}
        <View style={styles.card}>

          <View style={styles.imagePickerContainer}>
            <TouchableOpacity
              style={styles.imagePickerBtn}
              onPress={async () => {
                const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.Images,
                  allowsEditing: true,
                  aspect: [1, 1],
                  quality: 0.8,
                });
                if (!result.canceled) {
                  setProfileImage(result.assets[0].uri);
                }
              }}
            >
              {profileImage ? (
                <View style={styles.avatarPreview}>
                  <Image source={{ uri: profileImage }} style={styles.avatarImage} />
                  <View style={styles.avatarCameraOverlay}>
                    <Ionicons name="camera" size={24} color="#FFF" style={styles.avatarCameraIcon} />
                  </View>
                </View>
              ) : (
                <Ionicons name="camera-outline" size={32} color="#9CA3AF" />
              )}
            </TouchableOpacity>
            {profileImage && (
              <TouchableOpacity
                style={styles.imageRemoveBtn}
                onPress={() => setProfileImage(null)}
              >
                <Text style={styles.imageRemoveText}>ลบรูปภาพ</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.imagePickerHint}>รูปโปรไฟล์ (ไม่บังคับ)</Text>
          </View>

          <SectionLabel label="ข้อมูลส่วนตัว" />

          {/* คำนำหน้า — Dropdown */}
          <DropdownField
            label="คำนำหน้า"
            value={title}
            placeholder="เลือกคำนำหน้า"
            onPress={() => openDropdown('คำนำหน้า', TITLE_OPTIONS, setTitle)}
          />

          <FieldRow label="ชื่อ *" value={firstName} onChange={setFirstName} placeholder="ชื่อจริง" />
          <FieldRow label="นามสกุล" value={lastName} onChange={setLastName} placeholder="นามสกุล" />
          <FieldRow label="เบอร์โทร" value={phone} onChange={setPhone} placeholder="08x-xxx-xxxx" keyboardType="phone-pad" maxLength={10} />
          <FieldRow label="อีเมล" value={email} onChange={setEmail} placeholder="email@example.com" keyboardType="email-address" />

          <SectionLabel label="ที่อยู่" />

          <FieldRow label="ที่อยู่ (บ้านเลขที่ ถนน)" value={addressLine} onChange={setAddressLine} placeholder="123 ม.1 ถ.จิระ" />

          {/* จังหวัด — Dropdown */}
          <DropdownField
            label="จังหวัด"
            value={province}
            placeholder="เลือกจังหวัด"
            onPress={() => openDropdown('จังหวัด', PROVINCES, (val) => {
              setProvince(val);
              setDistrict('');
              setSubdistrict('');
            })}
          />

          {/* อำเภอ — Dropdown */}
          <DropdownField
            label="อำเภอ"
            value={district}
            placeholder={province ? 'เลือกอำเภอ' : 'เลือกจังหวัดก่อน'}
            disabled={!province}
            onPress={() => openDropdown('อำเภอ', districtOptions, (val) => {
              setDistrict(val);
              setSubdistrict('');
            })}
          />

          {/* ตำบล — Dropdown */}
          <DropdownField
            label="ตำบล"
            value={subdistrict}
            placeholder={district ? 'เลือกตำบล' : 'เลือกอำเภอก่อน'}
            disabled={!district}
            onPress={() => openDropdown('ตำบล', subdistrictOptions, setSubdistrict)}
          />

          <SectionLabel label="ประเภทร้าน" />
          <View style={styles.shopTypeRow}>
            {shopTypes.map((st) => (
              <TouchableOpacity
                key={st.shop_type_id}
                style={[styles.shopTypeBtn, selectedShopType === st.shop_type_id && styles.shopTypeBtnActive]}
                onPress={() => setSelectedShopType(st.shop_type_id)}
              >
                <Text style={[styles.shopTypeBtnText, selectedShopType === st.shop_type_id && styles.shopTypeBtnTextActive]}>
                  {st.type_name}
                </Text>
                {st.require_grease_trap && (
                  <Text style={styles.greaseBadge}>มีบ่อดักไขมัน</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <SectionLabel label="ข้อมูลล็อกอิน" />

          <FieldRow label="Username *" value={username} onChange={setUsername} placeholder="เช่น tenant001" autoCapitalize="none" />
          {usernameError ? <Text style={styles.errorText}>{usernameError}</Text> : null}
          <Text style={styles.usernameNote}>รหัสผ่านชั่วคราวจะถูกสร้างให้อัตโนมัติ</Text>

        </View>

        <TouchableOpacity
          style={[styles.createBtn, loading && { opacity: 0.7 }]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.createBtnText}>สร้างบัญชีผู้เช่า</Text>}
        </TouchableOpacity>

      </ScrollView>

      {/* ─── Dropdown Modal ─── */}
      <Modal visible={dropdownVisible} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          <View style={styles.ddOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.ddModal}>
                <View style={styles.ddHeader}>
                  <Text style={styles.ddTitle}>{dropdownTitle}</Text>
                  <TouchableOpacity onPress={() => setDropdownVisible(false)}>
                    <Ionicons name="close" size={24} color="#374151" />
                  </TouchableOpacity>
                </View>

                {dropdownOptions.length > 5 && (
                  <TextInput
                    style={styles.ddSearchInput}
                    placeholder={`ค้นหา${dropdownTitle}...`}
                    placeholderTextColor="#9CA3AF"
                    value={dropdownSearch}
                    onChangeText={setDropdownSearch}
                  />
                )}

                <FlatList
                  data={filteredDropdownOptions}
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.ddItem} onPress={() => selectDropdownItem(item)}>
                      <Text style={styles.ddItemText}>{item}</Text>
                    </TouchableOpacity>
                  )}
                  style={{ maxHeight: 320 }}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

    </KeyboardAvoidingView>
  );
}

function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

function FieldRow({
  label, value, onChange, placeholder, keyboardType, multiline, autoCapitalize, maxLength
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; keyboardType?: any; multiline?: boolean; autoCapitalize?: any; maxLength?: number;
}) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && { height: 80, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        keyboardType={keyboardType || 'default'}
        multiline={multiline}
        autoCapitalize={autoCapitalize || 'words'}
        maxLength={maxLength}
      />
    </View>
  );
}

function DropdownField({
  label, value, placeholder, onPress, disabled,
}: {
  label: string; value: string; placeholder: string;
  onPress: () => void; disabled?: boolean;
}) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity
        style={[styles.input, styles.ddFieldRow, disabled && { opacity: 0.5 }]}
        onPress={disabled ? undefined : onPress}
        activeOpacity={disabled ? 1 : 0.7}
      >
        <Text style={[styles.ddFieldText, !value && { color: '#9CA3AF' }]}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  scroll: { paddingBottom: 40 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  card: { backgroundColor: '#fff', margin: 16, borderRadius: 16, padding: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#7C3AED', marginTop: 16, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldRow: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#1F2937',
  },
  ddFieldRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ddFieldText: { fontSize: 14, color: '#1F2937' },
  shopTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  shopTypeBtn: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB',
  },
  shopTypeBtnActive: { borderColor: '#7C3AED', backgroundColor: '#F5F3FF' },
  shopTypeBtnText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  shopTypeBtnTextActive: { color: '#7C3AED' },
  greaseBadge: { fontSize: 10, color: '#D97706', marginTop: 2 },
  usernameNote: { fontSize: 12, color: '#9CA3AF', marginTop: -6, marginBottom: 4 },
  errorText: { color: '#EF4444', fontSize: 12, marginTop: -8, marginBottom: 8, marginLeft: 16 },
  createBtn: {
    backgroundColor: '#7C3AED', margin: 16, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', elevation: 3,
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Image Picker
  imagePickerContainer: { alignItems: 'center', marginVertical: 16 },
  imagePickerBtn: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: '#F3F4F6',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB',
    overflow: 'hidden'
  },
  avatarPreview: { width: '100%', height: '100%', position: 'relative' },
  avatarImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  avatarCameraOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 32,
    backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center'
  },
  avatarCameraIcon: { marginTop: -2 },
  imageRemoveBtn: { marginTop: 8 },
  imageRemoveText: { color: '#EF4444', fontSize: 13, fontWeight: '600' },
  imagePickerHint: { color: '#9CA3AF', fontSize: 13, marginTop: 6 },

  // Dropdown Modal
  ddOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  ddModal: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34 },
  ddHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  ddTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  ddSearchInput: {
    backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: '#1F2937', marginBottom: 8,
  },
  ddItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  ddItemText: { fontSize: 15, color: '#1F2937' },

  // Success
  successCard: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28 },
  successIcon: { marginBottom: 16 },
  successTitle: { fontSize: 22, fontWeight: '800', color: '#1F2937', marginBottom: 6 },
  successSub: { fontSize: 14, color: '#6B7280', marginBottom: 28, textAlign: 'center' },
  credBox: {
    width: '100%', backgroundColor: '#F5F3FF', borderRadius: 14, padding: 16,
    marginBottom: 14, borderWidth: 1.5, borderColor: '#DDD6FE',
  },
  credLabel: { fontSize: 12, color: '#7C3AED', fontWeight: '700', marginBottom: 6 },
  credRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  credValue: { fontSize: 18, fontWeight: '800', color: '#1F2937', flex: 1 },
  credNote: { fontSize: 13, color: '#D97706', textAlign: 'center', marginBottom: 24 },
  doneBtn: { backgroundColor: '#7C3AED', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 48, alignItems: 'center' },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
