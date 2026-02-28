import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Status =
  | 'PENDING' | 'APPROVED' | 'REJECTED'
  | 'ACTIVE' | 'EXPIRED' | 'TERMINATED'
  | 'PAID' | 'OVERDUE'
  | 'IN_PROGRESS' | 'COMPLETED'
  | 'VACANT' | 'OCCUPIED' | 'MAINTENANCE'
  | string;

const STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  PENDING:    { label: 'รอดำเนินการ', bg: '#FEF3C7', text: '#92400E' },
  APPROVED:   { label: 'อนุมัติแล้ว', bg: '#D1FAE5', text: '#065F46' },
  REJECTED:   { label: 'ปฏิเสธ',      bg: '#FEE2E2', text: '#991B1B' },
  ACTIVE:     { label: 'ใช้งานอยู่',   bg: '#D1FAE5', text: '#065F46' },
  EXPIRED:    { label: 'หมดอายุ',      bg: '#FEE2E2', text: '#991B1B' },
  TERMINATED: { label: 'ยกเลิกสัญญา', bg: '#FCE7F3', text: '#9D174D' },
  PAID:       { label: 'ชำระแล้ว',    bg: '#D1FAE5', text: '#065F46' },
  OVERDUE:    { label: 'เกินกำหนด',   bg: '#FEE2E2', text: '#991B1B' },
  IN_PROGRESS:{ label: 'กำลังดำเนินการ', bg: '#DBEAFE', text: '#1E40AF' },
  COMPLETED:  { label: 'เสร็จสิ้น',   bg: '#D1FAE5', text: '#065F46' },
  VACANT:     { label: 'ว่าง',         bg: '#D1FAE5', text: '#065F46' },
  OCCUPIED:   { label: 'มีผู้เช่า',    bg: '#DBEAFE', text: '#1E40AF' },
  MAINTENANCE:{ label: 'ซ่อมบำรุง',   bg: '#FEF3C7', text: '#92400E' },
};

interface Props {
  status: Status;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'md' }: Props) {
  const config = STATUS_MAP[status] || { label: status, bg: '#F3F4F6', text: '#374151' };
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }, size === 'sm' && styles.sm]}>
      <Text style={[styles.text, { color: config.text }, size === 'sm' && styles.textSm]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, alignSelf: 'flex-start' },
  sm: { paddingHorizontal: 8, paddingVertical: 2 },
  text: { fontSize: 13, fontWeight: '600' },
  textSm: { fontSize: 11 },
});
