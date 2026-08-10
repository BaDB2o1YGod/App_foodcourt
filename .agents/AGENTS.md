# AGENTS.md — Project-App Rules

> กฎเหล่านี้มีผลกับทุก AI agent ที่ทำงานในโปรเจกต์นี้

---

## 1. ภาพรวมโปรเจกต์ (Project Overview)

แอปพลิเคชันนี้ชื่อ **Project66** เป็นระบบจัดการ Food Court สร้างด้วย:

| Layer | Technology |
|---|---|
| Framework | Expo SDK ~54 + React Native 0.81 |
| Routing | Expo Router v6 (file-based routing) |
| Language | TypeScript (strict) |
| State Management | Zustand v5 |
| HTTP Client | Axios (ผ่าน `services/api.ts`) |
| Auth Storage | expo-secure-store |
| Push Notifications | expo-notifications + Firebase Messaging |
| Backend API | REST → `http://<host>:5000/api` |

---

## 2. โครงสร้างโปรเจกต์ (Directory Layout)

```
Project-App/
├── app/                    # Expo Router screens (file-based routing)
│   ├── _layout.tsx         # Root layout — auth guard อยู่ที่นี่
│   ├── (auth)/             # หน้า login / register (ไม่ต้องล็อกอิน)
│   ├── (tabs)/             # Tab navigator หลัก (General user)
│   ├── (admin)/            # หน้าสำหรับ ADMIN เท่านั้น
│   ├── (tenant)/           # หน้าสำหรับ TENANT เท่านั้น
│   ├── (maintenance)/      # หน้าสำหรับ MAINTENANCE เท่านั้น
│   └── (executive)/        # หน้าสำหรับ EXECUTIVE เท่านั้น
├── components/             # Reusable UI components
│   └── ui/                 # Primitive UI elements
├── constants/              # App-wide constants (colors, sizes ฯลฯ)
├── hooks/                  # Custom React hooks
│   └── usePushNotifications.ts
├── services/
│   └── api.ts              # Axios instance + ทุก API function
├── store/
│   └── authStore.ts        # Zustand auth store (ต้องใช้ useAuthStore)
├── assets/                 # Images, fonts
├── app.json                # Expo config
└── eas.json                # EAS Build config
```

---

## 3. ระบบ Role (User Roles)

```typescript
type Role = 'ADMIN' | 'TENANT' | 'MAINTENANCE' | 'EXECUTIVE';
```

| Role | โฟลเดอร์หน้า | สิทธิ์หลัก |
|---|---|---|
| ADMIN | `app/(admin)/` | จัดการทุกอย่าง: ผู้เช่า, บิล, แผง, ซ่อมบำรุง, รายงาน |
| TENANT | `app/(tenant)/` | ดูบิล, อัปโหลดสลิป, แจ้งซ่อม, ดูสัญญา |
| MAINTENANCE | `app/(maintenance)/` | รับงานซ่อม, อัปเดตสถานะ |
| EXECUTIVE | `app/(executive)/` | ดูรายงานสรุป, ภาพรวม |

**กฎ**: ห้ามใส่ logic ของ role หนึ่งไว้ในโฟลเดอร์ของอีก role หนึ่ง

---

## 4. กฎการเขียนโค้ด (Coding Rules)

### 4.1 API Calls

- **ห้าม** เรียก `axios` โดยตรงในหน้าจอหรือ component
- ใช้เฉพาะฟังก์ชันที่อยู่ใน `services/api.ts` เสมอ
- ถ้าต้องการ endpoint ใหม่ ให้เพิ่มใน `services/api.ts` ก่อน แล้วค่อยเรียกใช้

```typescript
// ✅ ถูกต้อง
import { billsAPI } from '@/services/api';
const res = await billsAPI.getAll();

// ❌ ผิด
import axios from 'axios';
const res = await axios.get('http://...');
```

### 4.2 Authentication & State

- ใช้ `useAuthStore` จาก `store/authStore.ts` เสมอ
- ห้าม อ่าน/เขียน SecureStore โดยตรงในหน้าจอ — ให้ทำผ่าน store

```typescript
// ✅ ถูกต้อง
const { user, logout } = useAuthStore();

// ❌ ผิด — อ่าน token เองในหน้าจอ
const token = await SecureStore.getItemAsync('token');
```

### 4.3 TypeScript

- **ห้ามใช้ `any`** ยกเว้นจำเป็นจริงๆ และต้องมี comment อธิบายเหตุผล
- ทุก interface/type ให้ประกาศที่บนสุดของไฟล์
- ใช้ `type` สำหรับ union/intersection, ใช้ `interface` สำหรับ object shape

### 4.4 Component & Style

- ใช้ `StyleSheet.create({})` เสมอ ห้ามใช้ inline style ยกเว้นค่าที่คำนวณ dynamic
- ตั้งชื่อ component ด้วย PascalCase เสมอ
- แยก logic ที่ซับซ้อนออกไปเป็น custom hook ใน `hooks/`

### 4.5 Navigation

- ใช้ `expo-router` เท่านั้น (`router.push`, `router.replace`, `Link`)
- ห้ามใช้ React Navigation โดยตรง (มีให้แล้วผ่าน Expo Router)

---

## 5. Push Notifications

- Hook หลักอยู่ที่ `hooks/usePushNotifications.ts`
- หลังล็อกอินสำเร็จ ให้เรียก `authAPI.updatePushToken(token)` เพื่อบันทึก FCM/Expo token ลง backend
- ห้าม call `Notifications.setNotificationHandler` นอก `usePushNotifications`

---

## 6. กฎการสร้างไฟล์ใหม่ (New File Rules)

| ประเภท | ที่เก็บ | ตัวอย่าง |
|---|---|---|
| หน้าจอ | `app/(role)/filename.tsx` | `app/(admin)/reports.tsx` |
| Reusable component | `components/ComponentName.tsx` | `components/BillCard.tsx` |
| Custom hook | `hooks/useHookName.ts` | `hooks/useContracts.ts` |
| API functions | `services/api.ts` (ต่อท้าย) | `contractsAPI.getAll()` |
| Global constant | `constants/` | `constants/Colors.ts` |
| State store | `store/storeName.ts` | `store/billStore.ts` |

---

## 7. EAS Build & Deployment

- **Development**: `expo start` หรือ `expo start --android`
- **EAS Build**: ใช้ `eas build` ตาม profile ใน `eas.json`
- **Package**: `com.badb2o1y1.project66` (Android), ห้ามเปลี่ยน
- **Project ID (EAS)**: `e9d43593-5d0a-478f-9177-4978e4560931`
- ห้าม commit ไฟล์ `google-services.json` ใหม่โดยไม่ได้รับอนุมัติ

---

## 8. Do / Don't สรุปเร็ว

| ✅ Do | ❌ Don't |
|---|---|
| ใช้ Expo Router (file-based) | เพิ่ม React Navigation stack เองใหม่ |
| ใช้ Zustand สำหรับ global state | ใช้ Redux หรือ Context API |
| เรียก API ผ่าน `services/api.ts` | เรียก fetch/axios โดยตรงในหน้า |
| TypeScript strict — ระบุ type เสมอ | ใช้ `any` โดยไม่มีเหตุผล |
| `StyleSheet.create` | Inline style object ที่ไม่ dynamic |
| ทดสอบทั้ง iOS และ Android | ทดสอบแค่ platform เดียว |
| ตั้งชื่อไฟล์ภาษาอังกฤษ kebab-case | ตั้งชื่อไฟล์ภาษาไทย |

---

## 9. คำแนะนำสำหรับ AI Agent

1. **อ่านโครงสร้าง** ก่อนสร้างไฟล์ใหม่เสมอ
2. **ตรวจสอบ `services/api.ts`** ก่อน — endpoint ที่ต้องการอาจมีแล้ว
3. **ตรวจสอบ `store/authStore.ts`** ก่อนเขียน auth logic
4. **สร้างแผน (implementation_plan.md)** ก่อนทำงานที่มีผลกระทบหลายไฟล์
5. **ห้ามลบหรือแก้ไข** `google-services.json`, `eas.json` โดยไม่ได้รับอนุมัติ
6. **ทุก component** ต้องรองรับ Dark Mode ผ่าน `useColorScheme()`
