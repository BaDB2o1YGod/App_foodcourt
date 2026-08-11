import { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Image, TouchableOpacity, RefreshControl } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { maintenanceAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StatusBadge from '../../components/ui/StatusBadge';

export default function MaintenanceDashboard() {
  const { user } = useAuthStore();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchJobs = async () => {
    if (!useAuthStore.getState().isAuthenticated) return;
    try {
      const res = await maintenanceAPI.getAll().catch(() => null);
      if (res) setJobs(res.data.data || []);
    } catch (e) {
      console.warn(e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchJobs().finally(() => setLoading(false));
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchJobs();
    setRefreshing(false);
  };

  if (loading) return <LoadingSpinner />;

  // Filter jobs assigned to the current user (safely check multiple possible keys and cast to string to avoid type mismatch)
  const myJobs = jobs.filter((j) => 
    j.assignments && j.assignments.some((a: any) => 
      String(a.staff_id) === String(user?.user_id) || 
      String(a.assignee?.user_id) === String(user?.user_id) ||
      String(a.assignee_id) === String(user?.user_id)
    )
  );

  const pending = myJobs.filter((j) => j.status === 'PENDING').length;
  const inProgress = myJobs.filter((j) => j.status === 'IN_PROGRESS').length;
  const completed = myJobs.filter((j) => j.status === 'COMPLETED').length;
  
  const activeJobs = myJobs.filter((j) => j.status !== 'COMPLETED' && j.status !== 'REJECTED');

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#80639A']} />}
    >
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>สวัสดีคุณ, {user?.first_name}</Text>
            <Text style={styles.subtitle}>เจ้าหน้าที่ซ่อมบำรุง</Text>
          </View>
          <Image
            source={require('../../assets/images/bru-logo.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
        </View>
      </View>
      <View style={styles.statsGrid}>
        <StatCard label="รอดำเนินการ" count={pending} color="#F59E0B" />
        <StatCard label="กำลังดำเนินการ" count={inProgress} color="#3B82F6" />
        <StatCard label="เสร็จสิ้น" count={completed} color="#10B981" />
      </View>
      {/* Active Jobs List */}
      <View style={styles.jobsSection}>
        <Text style={styles.sectionTitle}>งานที่ต้องรับผิดชอบ ({activeJobs.length})</Text>
        
        {activeJobs.length === 0 ? (
          <View style={styles.notice}>
             <Text style={styles.noticeTitle}>ไม่มีงานที่รอดำเนินการ</Text>
             <Text style={styles.noticeText}>ขณะนี้คุณไม่มีงานซ่อมที่ได้รับมอบหมาย</Text>
          </View>
        ) : (
          activeJobs.map((job) => (
            <TouchableOpacity 
              key={job.request_id} 
              style={styles.jobCard}
              onPress={() => router.push(`/(maintenance)/job-detail?id=${job.request_id}`)}
            >
              <View style={styles.jobHeader}>
                <Text style={styles.jobTitle} numberOfLines={1}>{job.title}</Text>
                <StatusBadge status={job.status} size="sm" />
              </View>
              {job.category && <Text style={styles.jobCat}>🏷 {job.category}</Text>}
              <Text style={styles.jobDate}>📍 ล็อก {job.slot?.slot_number || '-'} • 📅 {new Date(job.requested_at).toLocaleDateString('th-TH')}</Text>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function StatCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <Text style={[styles.count, { color }]}>{count}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { backgroundColor: '#80639A', padding: 24, marginBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLogo: { width: 72, height: 72 },
  greeting: { color: '#fff', fontSize: 20, fontWeight: '800' },
  subtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
  statsGrid: { flexDirection: 'row', gap: 10, paddingHorizontal: 16 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, alignItems: 'center', borderTopWidth: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  count: { fontSize: 26, fontWeight: '800' },
  label: { fontSize: 11, color: '#6B7280', marginTop: 4, textAlign: 'center' },
  notice: { margin: 16, backgroundColor: '#FFFBEB', borderRadius: 14, padding: 16, borderLeftWidth: 4, borderLeftColor: '#F59E0B' },
  noticeTitle: { fontWeight: '700', color: '#92400E', marginBottom: 4 },
  noticeText: { color: '#B45309', fontSize: 13 },
  jobsSection: { padding: 16, paddingTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 12 },
  jobCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  jobHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  jobTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', flex: 1, marginRight: 8 },
  jobCat: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  jobDate: { fontSize: 12, color: '#9CA3AF' },
});
