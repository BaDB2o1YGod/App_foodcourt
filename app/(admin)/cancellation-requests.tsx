import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StatusBadge from '../../components/ui/StatusBadge';
import { contractsAPI } from '../../services/api';

type FilterType = 'ALL' | 'TERMINATED' | 'REJECTED';

interface FilterOption {
  label: string;
  value: FilterType;
}

const FILTER_OPTIONS: FilterOption[] = [
  { label: 'ทั้งหมด', value: 'ALL' },
  { label: 'สัญญาที่ยกเลิกแล้ว', value: 'TERMINATED' },
  { label: 'คำร้องที่ถูกปฏิเสธ', value: 'REJECTED' },
];

export default function CancellationRequests() {
  const [activeTab, setActiveTab] = useState<'REQUESTS' | 'HISTORY'>('REQUESTS');

  // REQUESTS tab state
  const [requests, setRequests] = useState<any[]>([]);

  // HISTORY tab state
  const [terminatedHistory, setTerminatedHistory] = useState<any[]>([]);
  const [rejectedRequests, setRejectedRequests] = useState<any[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('ALL');
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const dropdownAnchorRef = useRef<View>(null);
  const [dropdownLayout, setDropdownLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  // Reset search/filter when switching tabs
  useEffect(() => {
    setSearchText('');
    setFilterType('ALL');
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'REQUESTS') {
        const res = await contractsAPI.getCancellationRequests();
        const all: any[] = res.data.data || [];
        setRequests(all.filter((r) => r.status === 'PENDING_TERMINATION'));
      } else {
        const [terminatedRes, cancellationRes] = await Promise.all([
          contractsAPI.getAll({ status: 'TERMINATED' }),
          contractsAPI.getCancellationRequests(),
        ]);
        setTerminatedHistory(terminatedRes.data.data || []);
        const allCancellations: any[] = cancellationRes.data.data || [];
        setRejectedRequests(allCancellations.filter((r) => r.status === 'REJECTED'));
      }
    } catch (e) {
      console.warn('Failed to fetch data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleUpdateStatus = (id: number, status: string, statusLabel: string) => {
    Alert.alert(
      `ยืนยันการ${statusLabel}`,
      `คุณต้องการ${statusLabel}คำร้องขอยกเลิกสัญญานี้หรือไม่?`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ยืนยัน',
          style: status === 'REJECTED' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await contractsAPI.updateCancellationStatus(id, status);
              fetchData();
            } catch (e: any) {
              Alert.alert('ผิดพลาด', e?.response?.data?.message || `ไม่สามารถ${statusLabel}คำร้องได้`);
            }
          },
        },
      ]
    );
  };

  // ─── Helper: ชื่อผู้เช่า ─────────────────────────────────
  const getTenantName = (item: any): string => {
    const t = item.tenant || item.user;
    if (t?.first_name) {
      return `${t.first_name} ${t.last_name || ''}`.trim();
    }
    return `ID: ${item.tenant_id}`;
  };

  // ─── Helper: ค้นหา ───────────────────────────────────────
  const matchesSearch = (item: any, isContract: boolean): boolean => {
    if (!searchText.trim()) return true;
    const q = searchText.toLowerCase();
    const contractNum = (
      isContract
        ? item.contract_number || `${item.contract_id}`
        : `${item.contract_id}`
    ).toLowerCase();
    const tenantName = getTenantName(item).toLowerCase();
    return contractNum.includes(q) || tenantName.includes(q);
  };

  // ─── Filtered history list ────────────────────────────────
  const filteredHistoryItems = useMemo(() => {
    type HistoryItem = { _type: 'TERMINATED' | 'REJECTED'; item: any };
    const result: HistoryItem[] = [];

    if (filterType === 'ALL' || filterType === 'TERMINATED') {
      terminatedHistory
        .filter((i) => matchesSearch(i, true))
        .forEach((i) => result.push({ _type: 'TERMINATED', item: i }));
    }
    if (filterType === 'ALL' || filterType === 'REJECTED') {
      rejectedRequests
        .filter((i) => matchesSearch(i, false))
        .forEach((i) => result.push({ _type: 'REJECTED', item: i }));
    }
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terminatedHistory, rejectedRequests, filterType, searchText]);

  // ─── Filtered requests list ──────────────────────────────
  const filteredRequests = useMemo(() => {
    if (!searchText.trim()) return requests;
    return requests.filter((i) => matchesSearch(i, false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests, searchText]);

  // ─── Dropdown helpers ────────────────────────────────────
  const openDropdown = () => {
    dropdownAnchorRef.current?.measureInWindow((x, y, width, height) => {
      setDropdownLayout({ x, y, width, height });
      setDropdownVisible(true);
    });
  };

  const selectedLabel = FILTER_OPTIONS.find((o) => o.value === filterType)?.label ?? 'ทั้งหมด';

  // ─── Render: REQUESTS card ───────────────────────────────
  const renderRequestItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.title}>ขอยกเลิก: {item.cancellation_reason}</Text>
          <Text style={styles.subtitle}>รหัสสัญญา: #{item.contract_id}</Text>
        </View>
        <StatusBadge status={item.status} size="sm" />
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="person" size={16} color="#6B7280" />
        <Text style={styles.infoText}>ผู้เช่า: {getTenantName(item)}</Text>
      </View>

      {item.cancellation_note ? (
        <View style={styles.infoRow}>
          <Ionicons name="document-text" size={16} color="#6B7280" />
          <Text style={styles.infoText}>เพิ่มเติม: {item.cancellation_note}</Text>
        </View>
      ) : null}

      <View style={styles.infoRow}>
        <Ionicons name="calendar" size={16} color="#6B7280" />
        <Text style={styles.infoText}>
          วันที่ขอ:{' '}
          {item.cancellation_requested_at
            ? new Date(item.cancellation_requested_at).toLocaleDateString('th-TH')
            : '-'}
        </Text>
      </View>

      {item.status === 'PENDING_TERMINATION' && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.rejectBtn]}
            onPress={() => handleUpdateStatus(item.contract_id, 'REJECTED', 'ปฏิเสธ')}
          >
            <Ionicons name="close-circle" size={18} color="#EF4444" />
            <Text style={styles.rejectBtnText}>ปฏิเสธ</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.approveBtn]}
            onPress={() => handleUpdateStatus(item.contract_id, 'APPROVED', 'อนุมัติ')}
          >
            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            <Text style={styles.approveBtnText}>อนุมัติ</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  // ─── Render: HISTORY card (unified) ─────────────────────
  const renderHistoryItem = ({
    item: row,
  }: {
    item: { _type: 'TERMINATED' | 'REJECTED'; item: any };
  }) => {
    const { _type, item } = row;

    if (_type === 'TERMINATED') {
      return (
        <View style={styles.card}>
          <View style={styles.sectionTypeBadge}>
            <Ionicons name="checkmark-done-circle" size={13} color="#6D28D9" />
            <Text style={[styles.sectionTypeBadgeText, { color: '#6D28D9' }]}>สัญญาที่ยกเลิกแล้ว</Text>
          </View>
          <View style={styles.cardHeader}>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.title}>
                สัญญา: {item.contract_number || `#${item.contract_id}`}
              </Text>
              <Text style={styles.subtitle}>ล็อค: {item.stall?.slot_number || '-'}</Text>
            </View>
            <StatusBadge status={item.status} size="sm" />
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="person" size={16} color="#6B7280" />
            <Text style={styles.infoText}>ผู้เช่า: {getTenantName(item)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={16} color="#6B7280" />
            <Text style={styles.infoText}>
              ยกเลิกเมื่อ:{' '}
              {item.terminated_at
                ? new Date(item.terminated_at).toLocaleDateString('th-TH')
                : item.updated_at
                ? new Date(item.updated_at).toLocaleDateString('th-TH')
                : '-'}
            </Text>
          </View>
        </View>
      );
    }

    // REJECTED
    return (
      <View style={styles.card}>
        <View style={styles.sectionTypeBadge}>
          <Ionicons name="close-circle" size={13} color="#EF4444" />
          <Text style={[styles.sectionTypeBadgeText, { color: '#EF4444' }]}>คำร้องที่ถูกปฏิเสธ</Text>
        </View>
        <View style={styles.cardHeader}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.title}>ขอยกเลิก: {item.cancellation_reason}</Text>
            <Text style={styles.subtitle}>รหัสสัญญา: #{item.contract_id}</Text>
          </View>
          <StatusBadge status={item.status} size="sm" />
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="person" size={16} color="#6B7280" />
          <Text style={styles.infoText}>ผู้เช่า: {getTenantName(item)}</Text>
        </View>

        {item.cancellation_note ? (
          <View style={styles.infoRow}>
            <Ionicons name="document-text" size={16} color="#6B7280" />
            <Text style={styles.infoText}>เพิ่มเติม: {item.cancellation_note}</Text>
          </View>
        ) : null}

        <View style={styles.infoRow}>
          <Ionicons name="calendar" size={16} color="#6B7280" />
          <Text style={styles.infoText}>
            วันที่ขอ:{' '}
            {item.cancellation_requested_at
              ? new Date(item.cancellation_requested_at).toLocaleDateString('th-TH')
              : '-'}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) return <LoadingSpinner message="กำลังโหลดคำร้อง..." />;

  return (
    <View style={styles.container}>
      {/* ── Tab Bar ─────────────────────────────── */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'REQUESTS' && styles.activeTab]}
          onPress={() => setActiveTab('REQUESTS')}
        >
          <Text style={[styles.tabText, activeTab === 'REQUESTS' && styles.activeTabText]}>
            คำร้องขอยกเลิกสัญญา
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'HISTORY' && styles.activeTab]}
          onPress={() => setActiveTab('HISTORY')}
        >
          <Text style={[styles.tabText, activeTab === 'HISTORY' && styles.activeTabText]}>
            ประวัติคำร้องขอยกเลิกสัญญา
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Search + Filter Bar ──────────────────── */}
      <View style={styles.searchBar}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={16} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={
              activeTab === 'REQUESTS'
                ? 'ค้นหาชื่อผู้เช่าหรือเลขสัญญา...'
                : 'ค้นหาชื่อผู้เช่าหรือเลขสัญญา...'
            }
            placeholderTextColor="#9CA3AF"
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Dropdown trigger — only in HISTORY tab */}
        {activeTab === 'HISTORY' && (
          <TouchableOpacity
            ref={dropdownAnchorRef}
            style={styles.filterBtn}
            onPress={openDropdown}
            activeOpacity={0.7}
          >
            <Text style={styles.filterBtnText} numberOfLines={1}>
              {selectedLabel}
            </Text>
            <Ionicons name="chevron-down" size={14} color="#7C3AED" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Content ──────────────────────────────── */}
      {activeTab === 'REQUESTS' ? (
        <FlatList
          data={filteredRequests}
          keyExtractor={(item) => item.contract_id?.toString() ?? Math.random().toString()}
          renderItem={renderRequestItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>
                {searchText ? 'ไม่พบรายการที่ค้นหา' : 'ไม่มีรายการคำร้องขอยกเลิกสัญญา'}
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={filteredHistoryItems}
          keyExtractor={(row, index) =>
            `${row._type}-${row.item.contract_id ?? index}`
          }
          renderItem={renderHistoryItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>
                {searchText ? 'ไม่พบรายการที่ค้นหา' : 'ไม่มีประวัติการยกเลิกสัญญา'}
              </Text>
            </View>
          }
        />
      )}

      {/* ── Dropdown Modal ────────────────────────── */}
      <Modal
        visible={dropdownVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDropdownVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setDropdownVisible(false)}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        <View
          style={[
            styles.dropdownMenu,
            {
              top: dropdownLayout.y + dropdownLayout.height + 4,
              right: 16, // align to right edge
            },
          ]}
        >
          {FILTER_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.dropdownItem,
                filterType === opt.value && styles.dropdownItemActive,
              ]}
              onPress={() => {
                setFilterType(opt.value);
                setDropdownVisible(false);
              }}
            >
              <Text
                style={[
                  styles.dropdownItemText,
                  filterType === opt.value && styles.dropdownItemTextActive,
                ]}
              >
                {opt.label}
              </Text>
              {filterType === opt.value && (
                <Ionicons name="checkmark" size={16} color="#7C3AED" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },

  // ── Tab bar ──────────────────────────────────────────────
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: { borderBottomColor: '#7C3AED' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  activeTabText: { color: '#7C3AED' },

  // ── Search bar ───────────────────────────────────────────
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 10,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
  },
  searchIcon: { marginRight: 6 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    paddingVertical: 0,
  },
  clearBtn: { paddingLeft: 6 },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE9FE',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    gap: 4,
    maxWidth: 140,
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C3AED',
    flexShrink: 1,
  },

  // ── List ─────────────────────────────────────────────────
  listContent: { padding: 16 },

  // ── Card ─────────────────────────────────────────────────
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  sectionTypeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerTitleContainer: { flex: 1, marginRight: 10 },
  title: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 2 },
  subtitle: { fontSize: 12, color: '#6B7280' },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingRight: 10,
  },
  infoText: { fontSize: 14, color: '#4B5563', marginLeft: 8, flex: 1 },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
    gap: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  rejectBtn: { borderColor: '#FECACA', backgroundColor: '#FEF2F2' },
  rejectBtnText: { color: '#EF4444', fontWeight: '600', marginLeft: 6, fontSize: 14 },
  approveBtn: { borderColor: '#A7F3D0', backgroundColor: '#ECFDF5' },
  approveBtnText: { color: '#10B981', fontWeight: '600', marginLeft: 6, fontSize: 14 },

  // ── Empty ────────────────────────────────────────────────
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#6B7280', marginTop: 12, fontSize: 16, textAlign: 'center' },

  // ── Dropdown ─────────────────────────────────────────────
  dropdownMenu: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 12,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropdownItemActive: { backgroundColor: '#F5F3FF' },
  dropdownItemText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  dropdownItemTextActive: { color: '#7C3AED', fontWeight: '700' },
});
