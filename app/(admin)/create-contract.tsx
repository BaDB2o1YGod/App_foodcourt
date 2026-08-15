import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal, Platform, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { contractsAPI, usersAPI, stallsAPI, foodCourtsAPI, shopTypesAPI } from '../../services/api';

// ─── ข้อมูลที่อยู่ (จังหวัด → อำเภอ → ตำบล) ─────────
const ADDRESS_DATA: Record<string, Record<string, string[]>> = {
  'บุรีรัมย์': {
    'เมืองบุรีรัมย์': ['ในเมือง', 'อิสาณ', 'เสม็ด', 'บ้านบัว', 'สะแกโพรง', 'สวายจีก', 'บ้านยาง', 'ลุมปุ๊ก', 'ชุมเห็ด', 'หลักเขต', 'สองห้อง', 'บัวทอง', 'ชุมแสง', 'หนองตาด', 'พระครู', 'ถลุงเหล็ก', 'กระสัง', 'กลันทา', 'เมืองฝาง'],
    'คูเมือง': ['คูเมือง', 'ปะเคียบ', 'บ้านแพ', 'พรสำราญ', 'หินเหล็กไฟ', 'ตูมใหญ่', 'หนองขมาร'],
    'กระสัง': ['กระสัง', 'ลำดวน', 'สองชั้น', 'สูงเนิน', 'หนองเต็ง', 'เมืองไผ่', 'ชุมแสง', 'บ้านปรือ', 'ห้วยสำราญ', 'กันทรารมย์', 'ศรีภูมิ'],
    'นางรอง': ['นางรอง', 'สะเดา', 'ชุมแสง', 'หนองโบสถ์', 'หนองกง', 'ถนนหัก', 'หัวถนน', 'ทรัพย์พระยา', 'หนองไทร', 'ก้านเหลือง', 'บ้านสิงห์', 'ลำไทรโยง', 'ทุ่งแสงทอง', 'หนองยายพิมพ์', 'ชุมแสง'],
    'หนองกี่': ['หนองกี่', 'เย้ยปราสาท', 'เมืองไผ่', 'ดอนอะราง', 'โคกสูง', 'ทุ่งกระตาดพัฒนา', 'ทุ่งกระเต็น', 'ท่าโพธิ์ชัย', 'โคกสว่าง', 'บุกระสัง'],
    'ลำปลายมาศ': ['ลำปลายมาศ', 'หนองคู', 'แสลงพัน', 'ทะเมนชัย', 'ตลาดโพธิ์', 'หนองกะทิง', 'โคกกลาง', 'โคกสะอาด', 'เมืองแฝก', 'บ้านยาง', 'ผไทรินทร์', 'โคกล่าม', 'หินโคน', 'หนองบัวโคก', 'บุโพธิ์', 'หนองโดน'],
    'ประโคนชัย': ['ประโคนชัย', 'แสลงโทน', 'บ้านไทร', 'ละเวี้ย', 'จรเข้มาก', 'ปังกู', 'โคกย่าง', 'โคกม้า', 'ไพศาล', 'ตะโกตาพิ', 'เขาคอก', 'หนองบอน', 'โคกตูม', 'ประทัดบุ', 'สี่เหลี่ยม', 'โคกมะขาม'],
    'พุทไธสง': ['พุทไธสง', 'มะเฟือง', 'บ้านจาน', 'บ้านเป้า', 'บ้านแวง', 'บ้านยาง', 'หายโศก'],
    'สตึก': ['สตึก', 'นิคม', 'ทุ่งวัง', 'เมืองแก', 'หนองใหญ่', 'ร่อนทอง', 'ดอนมนต์', 'ชุมแสง', 'ท่าม่วง', 'สะแก', 'สนามชัย', 'กระสัง'],
    'ปะคำ': ['ปะคำ', 'ไทยเจริญ', 'หนองบัว', 'โคกมะม่วง', 'หูทำนบ'],
    'แคนดง': ['แคนดง', 'ดงพลอง', 'สระบัว', 'หัวฝาย'],
    'บ้านกรวด': ['บ้านกรวด', 'โนนเจริญ', 'หนองไม้งาม', 'ปราสาท', 'สายตะกู', 'หินลาด', 'บึงเจริญ', 'จันทบเพชร', 'เขาดินเหนือ'],
    'ชำนิ': ['ชำนิ', 'หนองปล่อง', 'เมืองยาง', 'ช่อผกา', 'ละลวด', 'โคกสนวน'],
    'บ้านด่าน': ['บ้านด่าน', 'ปราสาท', 'วังเหนือ', 'โนนขวาง'],
    'โนนสุวรรณ': ['โนนสุวรรณ', 'ทุ่งจังหัน', 'โกรกแก้ว', 'ดงอีจาน', 'โนนสุวรรณ'],
    'โนนดินแดง': ['โนนดินแดง', 'สำโรงใหม่', 'ลำนางรอง'],
    'เฉลิมพระเกียรติ': ['เจริญสุข', 'ตาเป๊ก', 'อีสานเขต', 'ถาวร', 'ยายแย้มวัฒนา'],
    'พลับพลาชัย': ['พลับพลาชัย', 'สะเดา', 'จันดุม', 'ป่าชัน', 'สำโรง'],
    'ห้วยราช': ['ห้วยราช', 'สามแวง', 'ตาเสา', 'บ้านตะโก', 'สนวน', 'โคกเหล็ก', 'เมืองโพธิ์', 'ห้วยราชา'],
    'บ้านใหม่ไชยพจน์': ['หนองแวง', 'ทองหลาง', 'แดงใหญ่', 'กู่สวนแตง', 'หนองเยือง'],
    'หนองหงส์': ['หนองหงส์', 'สระแก้ว', 'ห้วยหิน', 'ไทยสามัคคี', 'สระทอง', 'เสาเดียว', 'เมืองฝ้าย'],
  },
  'นครราชสีมา': {
    'เมืองนครราชสีมา': ['ในเมือง', 'โพธิ์กลาง', 'หนองจะบก', 'โคกสูง', 'หนองไผ่ล้อม', 'หมื่นไวย', 'พลกรัง', 'หัวทะเล', 'บ้านเกาะ', 'บ้านใหม่', 'พุดซา', 'จอหอ', 'ตลาด', 'หนองบัวศาลา'],
    'ปากช่อง': ['ปากช่อง', 'กลางดง', 'จันทึก', 'วังกะทะ', 'หมูสี', 'หนองสาหร่าย', 'คลองม่วง', 'ขนงพระ'],
    'พิมาย': ['ในเมือง', 'สัมฤทธิ์', 'โบสถ์', 'กระเบื้องใหญ่', 'ท่าหลวง', 'รังกาใหญ่', 'ชีวาน', 'นิคมสร้างตนเอง', 'กระชอน', 'ธารละหลอด', 'หนองระเวียง', 'ดงใหญ่'],
  },
  'สุรินทร์': {
    'เมืองสุรินทร์': ['ในเมือง', 'ตั้งใจ', 'เพี้ยราม', 'นาดี', 'ท่าสว่าง', 'สลักได', 'ตาอ็อง', 'สำโรง', 'แกใหญ่', 'นอกเมือง', 'คอโค', 'สวาย', 'เฉนียง', 'เทนมีย์', 'บุฤาษี', 'ทุ่งกุลา', 'หนองบัว', 'กาเกาะ', 'แสลงพันธ์'],
    'ปราสาท': ['กังแอน', 'ทมอ', 'ไพล', 'ปรือ', 'ทุ่งมน', 'ตาเบา', 'หนองใหญ่', 'โคกยาง', 'โคกสะอาด', 'บ้านไทร', 'โชคนาสาม', 'เชื้อเพลิง', 'ปราสาททนง', 'ตานี', 'บ้านพลวง', 'กันตวจระมวล', 'สมุด', 'ประทัดบุ'],
  },
};

const PROVINCES = Object.keys(ADDRESS_DATA);

export default function CreateContractScreen() {
  const { slot_id, slot_number } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [tenants, setTenants] = useState<any[]>([]);

  // Manual Slot Selection States
  const [foodCourts, setFoodCourts] = useState<any[]>([]);
  const [selectedFoodCourtId, setSelectedFoodCourtId] = useState<number | null>(null);
  const [selectedFoodCourtName, setSelectedFoodCourtName] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [formSlotId, setFormSlotId] = useState<number | null>(slot_id ? Number(slot_id) : null);
  const [formSlotNumber, setFormSlotNumber] = useState<string>(slot_number ? String(slot_number) : '');

  // Form Fields
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const [menuType, setMenuType] = useState<string>('');
  const [shopTypes, setShopTypes] = useState<any[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [deposit, setDeposit] = useState('');
  const [idCard, setIdCard] = useState('');
  const [phone, setPhone] = useState('');

  // Address Fields
  const [addressLine, setAddressLine] = useState('');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [subdistrict, setSubdistrict] = useState('');

  const [receiptNumber, setReceiptNumber] = useState('');
  const [receiptDate, setReceiptDate] = useState('');

  // Contract photo images
  const [contractImages, setContractImages] = useState<ImagePicker.ImagePickerAsset[]>([]);

  // Dropdown Modal for Tenants
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState('');

  // Generic Dropdown Modal (for Address)
  const [genDropdownVisible, setGenDropdownVisible] = useState(false);
  const [genDropdownTitle, setGenDropdownTitle] = useState('');
  const [genDropdownOptions, setGenDropdownOptions] = useState<string[]>([]);
  const [genDropdownSearch, setGenDropdownSearch] = useState('');
  const [genDropdownOnSelect, setGenDropdownOnSelect] = useState<(val: string) => void>(() => { });

  // DatePicker Modal
  const [showDatePicker, setShowDatePicker] = useState<string | null>(null);

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(null);
    }

    if (event.type === 'dismissed') {
      setShowDatePicker(null);
      return;
    }

    if (selectedDate && showDatePicker) {
      const pad = (n: number) => n.toString().padStart(2, '0');
      const formatted = `${pad(selectedDate.getDate())}/${pad(selectedDate.getMonth() + 1)}/${selectedDate.getFullYear()}`;

      if (showDatePicker === 'start') setStartDate(formatted);
      else if (showDatePicker === 'end') setEndDate(formatted);
      else if (showDatePicker === 'receipt') setReceiptDate(formatted);

      if (Platform.OS === 'ios') {
        setShowDatePicker(null);
      }
    }
  };

  const parseToDateObj = (dateStr: string) => {
    if (!dateStr) return new Date();
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    return new Date();
  };

  useEffect(() => {
    // โหลดรายชื่อผู้เช่าทั้งหมด
    usersAPI.getAll({ role: 'TENANT' })
      .then((res) => {
        const availableTenants = (res.data.data || []).filter((t: any) => (t.is_active !== false) && !t.stall);
        setTenants(availableTenants);
      })
      .catch((e) => console.error('Failed to load tenants', e));

    // Load shop types
    shopTypesAPI.getAll()
      .then((res) => setShopTypes(res.data.data || []))
      .catch((e) => console.error('Failed to load shop types', e));

    // Default dates (DD/MM/YYYY)
    const today = new Date();
    const nextYear = new Date();
    nextYear.setFullYear(today.getFullYear() + 1);

    const pad = (n: number) => n.toString().padStart(2, '0');
    setStartDate(`${pad(today.getDate())}/${pad(today.getMonth() + 1)}/${today.getFullYear()}`);
    setEndDate(`${pad(nextYear.getDate())}/${pad(nextYear.getMonth() + 1)}/${nextYear.getFullYear()}`);

    // Load food courts if no slot_id provided
    if (!slot_id) {
      foodCourtsAPI.getAll()
        .then((res) => {
          setFoodCourts(res.data.data || []);
        })
        .catch((e) => console.error('Failed to load food courts', e));
    }
  }, []);

  // Fetch available slots when food court changes
  useEffect(() => {
    if (selectedFoodCourtId) {
      stallsAPI.getAll({ food_court_id: selectedFoodCourtId, status: 'VACANT' })
        .then((res) => {
          setAvailableSlots(res.data.data || []);
        })
        .catch((e) => console.error('Failed to load slots', e));
    } else {
      setAvailableSlots([]);
    }
    // Reset selected slot when food court changes (if not initially provided)
    if (!slot_id) {
      setFormSlotId(null);
      setFormSlotNumber('');
      setDeposit('');
    }
  }, [selectedFoodCourtId, slot_id]);

  // Fetch deposit when slot changes
  useEffect(() => {
    // ดึงค่าเช่าของล็อกแล้วคูณ 3 เป็นเงินมัดจำ
    if (formSlotId) {
      stallsAPI.getById(formSlotId)
        .then((res) => {
          const slot = res.data.data;
          if (slot?.rent) {
            setDeposit((slot.rent * 3).toString());
          }
        })
        .catch((e) => console.error('Failed to load stall info', e));
    }
  }, [formSlotId]);

  // ─── Image Pick / Camera ────────────────────────────────
  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('สิทธิ์ไม่เพียงพอ', 'กรุณาอนุญาตการเข้าถึงคลังรูปภาพในการตั้งค่า');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
    });
    if (!result.canceled) {
      setContractImages(prev => [...prev, ...result.assets]);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('สิทธิ์ไม่เพียงพอ', 'กรุณาอนุญาตการเข้าถึงกล้องในการตั้งค่า');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
    });
    if (!result.canceled) {
      setContractImages(prev => [...prev, ...result.assets]);
    }
  };

  const removeImage = (index: number) => {
    setContractImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    const missing = [];
    if (!formSlotId) missing.push('ข้อมูลล็อก (Stall)');
    if (!selectedTenantId) missing.push('ผู้เช่า');
    if (!startDate) missing.push('วันที่เริ่มสัญญา');
    if (!endDate) missing.push('วันสิ้นสุดสัญญา');

    if (missing.length > 0) {
      Alert.alert('แจ้งเตือน', `กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน\n(ขาด: ${missing.join(', ')})`);
      return;
    }

    setLoading(true);
    try {
      const formatDateToISO = (dateStr: string) => {
        if (!dateStr) return '';
        if (dateStr.includes('-') && dateStr.split('-')[0].length === 4) return dateStr;
        const parts = dateStr.split(/[\/-]/);
        if (parts.length === 3) {
          return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
        return dateStr;
      };

      const formData = new FormData();
      formData.append('slot_id', formSlotId!.toString());
      formData.append('tenant_id', selectedTenantId!.toString());
      formData.append('startDate', formatDateToISO(startDate));
      formData.append('endDate', formatDateToISO(endDate));

      if (menuType) formData.append('menuType', menuType);
      if (deposit) formData.append('deposit_amount', deposit);
      if (idCard) formData.append('idCard', idCard);
      if (phone) formData.append('phone', phone);

      // รวมที่อยู่เข้าด้วยกัน
      const fullAddress = `${addressLine || ''} ${subdistrict ? `ต.${subdistrict}` : ''} ${district ? `อ.${district}` : ''} ${province ? `จ.${province}` : ''}`.trim();
      if (fullAddress) formData.append('address', fullAddress);

      if (receiptNumber) formData.append('receiptNumber', receiptNumber);
      if (receiptDate) formData.append('receiptDate', formatDateToISO(receiptDate));

      // Append contract images
      contractImages.forEach((asset, i) => {
        let fileName = asset.fileName;
        let mimeType = asset.mimeType;

        if (!fileName) {
          const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
          fileName = `contract_${i}.${ext}`;
        }
        if (!mimeType) {
          const ext = fileName.split('.').pop()?.toLowerCase() || 'jpg';
          if (ext === 'png') mimeType = 'image/png';
          else if (ext === 'heic' || ext === 'heif') mimeType = 'image/heic';
          else mimeType = 'image/jpeg';
        }

        formData.append('contractImages', {
          uri: asset.uri,
          type: mimeType,
          name: fileName,
        } as any);
      });

      await contractsAPI.create(formData);

      Alert.alert('สำเร็จ', 'บันทึกสัญญาเช่าใหม่เรียบร้อยแล้ว', [
        { text: 'ตกลง', onPress: () => router.back() }
      ]);
    } catch (e: any) {
      Alert.alert('ผิดพลาด', e?.response?.data?.message || 'ไม่สามารถบันทึกสัญญาได้');
    } finally {
      setLoading(false);
    }
  };

  const selectedTenant = tenants.find(t => t.user_id === selectedTenantId);
  const tenantLabel = selectedTenant
    ? `${selectedTenant.first_name} ${selectedTenant.last_name || ''} (@${selectedTenant.username})`
    : '';

  const filteredTenants = dropdownSearch
    ? tenants.filter(t =>
      `${t.first_name} ${t.last_name} ${t.username}`.toLowerCase().includes(dropdownSearch.toLowerCase())
    )
    : tenants;

  // Helpers for Gen Dropdown
  const districtOptions = province && ADDRESS_DATA[province] ? Object.keys(ADDRESS_DATA[province]) : [];
  const subdistrictOptions = province && district && ADDRESS_DATA[province][district] ? ADDRESS_DATA[province][district] : [];

  const openGenDropdown = (title: string, options: string[], onSelect: (val: string) => void) => {
    setGenDropdownTitle(title);
    setGenDropdownOptions(options);
    setGenDropdownSearch('');
    setGenDropdownOnSelect(() => onSelect);
    setGenDropdownVisible(true);
  };

  const selectGenDropdownItem = (item: string) => {
    genDropdownOnSelect(item);
    setGenDropdownVisible(false);
  };

  const filteredGenDropdownOptions = genDropdownOptions.filter((opt) =>
    opt.toLowerCase().includes(genDropdownSearch.toLowerCase())
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>เพิ่มสัญญาเช่า</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>ข้อมูลล็อก (Stall)</Text>
          {slot_id ? (
            <View style={styles.ddFieldRow}>
              <Text style={styles.ddFieldText}>กำลังสร้างสัญญาให้ล็อก: {slot_number}</Text>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.ddFieldRow, { marginBottom: 16 }]}
                onPress={() => openGenDropdown('เลือกศูนย์อาหาร', foodCourts.map(f => f.name), (val) => {
                  const fc = foodCourts.find(f => f.name === val);
                  if (fc) {
                    setSelectedFoodCourtId(fc.food_court_id);
                    setSelectedFoodCourtName(fc.name);
                  }
                })}
              >
                <Text style={[styles.ddFieldText, !selectedFoodCourtName && { color: '#9CA3AF' }]}>
                  {selectedFoodCourtName || 'เลือกศูนย์อาหาร'}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.ddFieldRow}
                onPress={() => openGenDropdown('เลือกล็อก', availableSlots.map(s => s.slot_number), (val) => {
                  const slot = availableSlots.find(s => s.slot_number === val);
                  if (slot) {
                    setFormSlotId(slot.slot_id);
                    setFormSlotNumber(slot.slot_number);
                  }
                })}
                disabled={!selectedFoodCourtId || availableSlots.length === 0}
              >
                <Text style={[styles.ddFieldText, (!formSlotNumber || availableSlots.length === 0) && { color: '#9CA3AF' }]}>
                  {formSlotNumber || (availableSlots.length > 0 ? 'เลือกล็อกที่ต้องการเช่า' : (selectedFoodCourtId ? 'ไม่มีล็อกว่าง' : 'กรุณาเลือกศูนย์อาหารก่อน'))}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </>
          )}

          <Text style={[styles.sectionLabel, { marginTop: 24 }]}>เลือกผู้เช่า</Text>

          <TouchableOpacity
            style={styles.ddFieldRow}
            onPress={() => { setDropdownSearch(''); setDropdownVisible(true); }}
          >
            <Text style={[styles.ddFieldText, !selectedTenantId && { color: '#9CA3AF' }]}>
              {tenantLabel || 'เลือกบัญชีผู้เช่า (ต้องสร้างบัญชีผู้เช่าก่อน)'}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
          </TouchableOpacity>
          {!tenants.length && (
            <Text style={styles.noteText}>ยังไม่มีรายชื่อผู้เช่า กรุณาไปสร้างบัญชีผู้เช่าก่อน</Text>
          )}

          <Text style={styles.sectionLabel}>ข้อมูลสัญญา</Text>

          <DateDropdownField
            label="วันที่เริ่มสัญญา"
            value={startDate}
            placeholder="เลือกวันที่"
            onPress={() => setShowDatePicker('start')}
          />
          <DateDropdownField
            label="วันสิ้นสุดสัญญา"
            value={endDate}
            placeholder="เลือกวันที่"
            onPress={() => setShowDatePicker('end')}
          />
          <FieldRow label="เงินมัดจำ (บาท)" value={deposit} onChange={setDeposit} placeholder="เช่น 5000" keyboardType="numeric" />

          <Text style={[styles.sectionLabel, { marginTop: 24 }]}>หมวดหมู่ร้านค้า (ประเภทอาหาร)</Text>
          <TouchableOpacity
            style={styles.ddFieldRow}
            onPress={() => openGenDropdown('เลือกหมวดหมู่ร้านค้า', shopTypes.map(s => s.type_name), (val) => {
              setMenuType(val);
            })}
          >
            <Text style={[styles.ddFieldText, !menuType && { color: '#9CA3AF' }]}>
              {menuType || 'เลือกหมวดหมู่ (เช่น ของคาว, ขนม, น้ำหวาน)'}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <Text style={[styles.sectionLabel, { marginTop: 24 }]}>ข้อมูลผู้เช่า (เลือกกรอก)</Text>

          <FieldRow label="รหัสบัตรประชาชน" value={idCard} onChange={setIdCard} placeholder="13 หลัก" keyboardType="numeric" maxLength={13} />
          <FieldRow label="เบอร์โทรศัพท์" value={phone} onChange={setPhone} placeholder="08x-xxx-xxxx" keyboardType="phone-pad" maxLength={10} />

          <Text style={styles.sectionLabel}>ที่อยู่</Text>
          <FieldRow label="ที่อยู่ (บ้านเลขที่ ถนน)" value={addressLine} onChange={setAddressLine} placeholder="123 ม.1 ถ.จิระ" />

          <DropdownField
            label="จังหวัด"
            value={province}
            placeholder="เลือกจังหวัด"
            onPress={() => openGenDropdown('จังหวัด', PROVINCES, (val) => {
              setProvince(val);
              setDistrict('');
              setSubdistrict('');
            })}
          />
          <DropdownField
            label="อำเภอ"
            value={district}
            placeholder={province ? 'เลือกอำเภอ' : 'เลือกจังหวัดก่อน'}
            disabled={!province}
            onPress={() => openGenDropdown('อำเภอ', districtOptions, (val) => {
              setDistrict(val);
              setSubdistrict('');
            })}
          />
          <DropdownField
            label="ตำบล"
            value={subdistrict}
            placeholder={district ? 'เลือกตำบล' : 'เลือกอำเภอก่อน'}
            disabled={!district}
            onPress={() => openGenDropdown('ตำบล', subdistrictOptions, setSubdistrict)}
          />

          <Text style={styles.sectionLabel}>การชำระเงิน</Text>
          <FieldRow label="เลขที่ใบเสร็จมัดจำ" value={receiptNumber} onChange={setReceiptNumber} placeholder="เลขที่ใบเสร็จ" keyboardType="numeric" />
          <DateDropdownField
            label="วันที่ออกใบเสร็จ"
            value={receiptDate}
            placeholder="เลือกวันที่"
            onPress={() => setShowDatePicker('receipt')}
          />

          <Text style={styles.sectionLabel}>ภาพถ่ายสัญญา</Text>
          <View style={styles.imageUploadRow}>
            <TouchableOpacity style={styles.imagePickBtn} onPress={pickFromGallery}>
              <Ionicons name="images-outline" size={22} color="#7C3AED" />
              <Text style={styles.imagePickBtnText}>เลือกรูป</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.imagePickBtn} onPress={takePhoto}>
              <Ionicons name="camera-outline" size={22} color="#7C3AED" />
              <Text style={styles.imagePickBtnText}>ถ่ายรูป</Text>
            </TouchableOpacity>
          </View>

          {contractImages.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagePreviewScroll}>
              {contractImages.map((asset, idx) => (
                <View key={`${asset.uri}-${idx}`} style={styles.imagePreviewWrapper}>
                  <Image source={{ uri: asset.uri }} style={styles.imagePreview} />
                  <TouchableOpacity style={styles.imageRemoveBtn} onPress={() => removeImage(idx)}>
                    <Ionicons name="close-circle" size={22} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
          {contractImages.length > 0 && (
            <Text style={styles.imageCountText}>{contractImages.length} รูปที่เลือก</Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.createBtn, (loading || !selectedTenantId) && { opacity: 0.7 }]}
          onPress={handleCreate}
          disabled={loading || !selectedTenantId}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.createBtnText}>บันทึกสัญญาเช่า</Text>}
        </TouchableOpacity>
      </ScrollView>

      {/* Dropdown Modal for Tenants */}
      <Modal visible={dropdownVisible} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          <View style={styles.ddOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.ddModal}>
                <View style={styles.ddHeader}>
                  <Text style={styles.ddTitle}>เลือกบัญชีผู้เช่า</Text>
                  <TouchableOpacity onPress={() => setDropdownVisible(false)}>
                    <Ionicons name="close" size={24} color="#374151" />
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.ddSearchInput}
                  placeholder="ค้นหาชื่อ หรือ Username..."
                  placeholderTextColor="#9CA3AF"
                  value={dropdownSearch}
                  onChangeText={setDropdownSearch}
                />

                <FlatList
                  data={filteredTenants}
                  keyExtractor={(item) => item.user_id.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.ddItem}
                      onPress={() => {
                        setSelectedTenantId(item.user_id);
                        setDropdownVisible(false);

                        // Autofill ALL data from tenant profile
                        if (item.phone && !phone) setPhone(item.phone);
                        if (item.address_line) setAddressLine(item.address_line);
                        if (item.province) setProvince(item.province);
                        if (item.district) setDistrict(item.district);
                        if (item.subdistrict) setSubdistrict(item.subdistrict);
                      }}
                    >
                      <Text style={styles.ddItemName}>{item.first_name} {item.last_name}</Text>
                      <Text style={styles.ddItemSub}>@{item.username}</Text>
                    </TouchableOpacity>
                  )}
                  style={{ maxHeight: 350 }}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  ListEmptyComponent={<Text style={{ padding: 20, textAlign: 'center', color: '#9CA3AF' }}>ไม่พบรายชื่อผู้เช่า</Text>}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Generic Dropdown Modal (for Address) */}
      <Modal visible={genDropdownVisible} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          <View style={styles.ddOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.ddModal}>
                <View style={styles.ddHeader}>
                  <Text style={styles.ddTitle}>{genDropdownTitle}</Text>
                  <TouchableOpacity onPress={() => setGenDropdownVisible(false)}>
                    <Ionicons name="close" size={24} color="#374151" />
                  </TouchableOpacity>
                </View>

                {genDropdownOptions.length > 5 && (
                  <TextInput
                    style={styles.ddSearchInput}
                    placeholder={`ค้นหา${genDropdownTitle}...`}
                    placeholderTextColor="#9CA3AF"
                    value={genDropdownSearch}
                    onChangeText={setGenDropdownSearch}
                  />
                )}

                <FlatList
                  data={filteredGenDropdownOptions}
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.ddItem} onPress={() => selectGenDropdownItem(item)}>
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

      {/* DatePicker */}
      {showDatePicker && (
        <DateTimePicker
          value={
            showDatePicker === 'start' ? parseToDateObj(startDate) :
              showDatePicker === 'end' ? parseToDateObj(endDate) :
                parseToDateObj(receiptDate)
          }
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}

    </KeyboardAvoidingView>
  );
}

// ─── Components ─────────────────────────────────────────

function FieldRow({
  label, value, onChange, placeholder, keyboardType, multiline, maxLength, autoCapitalize
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; keyboardType?: any; multiline?: boolean; maxLength?: number; autoCapitalize?: any;
}) {
  const handleChangeText = (text: string) => {
    if (keyboardType === 'numeric' || keyboardType === 'phone-pad') {
      // กรณีกำหนดเป็นตัวเลข ให้กรองเอาเฉพาะตัวเลข 0-9
      const numericText = text.replace(/[^0-9]/g, '');
      onChange(numericText);
    } else {
      onChange(text);
    }
  };

  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && { height: 80, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={handleChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        keyboardType={keyboardType || 'default'}
        multiline={multiline}
        maxLength={maxLength}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

function DropdownField({
  label, value, placeholder, onPress, disabled
}: {
  label: string; value: string; placeholder: string; onPress: () => void; disabled?: boolean;
}) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity
        style={[styles.genDdFieldRow, disabled && { opacity: 0.5, backgroundColor: '#F3F4F6' }]}
        onPress={onPress}
        disabled={disabled}
      >
        <Text style={[styles.genDdFieldText, !value && { color: '#9CA3AF' }]}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
      </TouchableOpacity>
    </View>
  );
}

function DateDropdownField({
  label, value, placeholder, onPress, disabled
}: {
  label: string; value: string; placeholder: string; onPress: () => void; disabled?: boolean;
}) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity
        style={[styles.genDdFieldRow, disabled && { opacity: 0.5, backgroundColor: '#F3F4F6' }]}
        onPress={onPress}
        disabled={disabled}
      >
        <Text style={[styles.genDdFieldText, !value && { color: '#9CA3AF' }]}>
          {value || placeholder}
        </Text>
        <Ionicons name="calendar-outline" size={16} color="#9CA3AF" />
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────

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
  card: { backgroundColor: '#fff', margin: 16, borderRadius: 16, padding: 20, elevation: 2 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#7C3AED', marginTop: 16, marginBottom: 12, textTransform: 'uppercase' },
  fieldRow: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#1F2937',
  },
  ddFieldRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#7C3AED',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8
  },
  ddFieldText: { fontSize: 15, color: '#1F2937', fontWeight: '600' },

  genDdFieldRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11
  },
  genDdFieldText: { fontSize: 14, color: '#1F2937' },

  noteText: { fontSize: 12, color: '#EF4444', marginBottom: 8 },

  // Image upload styles
  imageUploadRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  imagePickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F5F3FF',
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
    borderRadius: 12,
    paddingVertical: 14,
    borderStyle: 'dashed' as any,
  },
  imagePickBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C3AED',
  },
  imagePreviewScroll: {
    marginBottom: 8,
  },
  imagePreviewWrapper: {
    position: 'relative' as const,
    marginRight: 10,
  },
  imagePreview: {
    width: 90,
    height: 90,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  imageRemoveBtn: {
    position: 'absolute' as const,
    top: -6,
    right: -6,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  imageCountText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },

  createBtn: {
    backgroundColor: '#7C3AED', margin: 16, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', elevation: 3,
  },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Modal
  ddOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  ddModal: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34 },
  ddHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  ddTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  ddSearchInput: {
    backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: '#1F2937', marginBottom: 8,
  },
  ddItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  ddItemName: { fontSize: 15, color: '#1F2937', fontWeight: '600' },
  ddItemSub: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  ddItemText: { fontSize: 15, color: '#1F2937' },
});
