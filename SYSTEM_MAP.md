# AppMustshare — System Map

## Overview

ระบบจัดเก็บและวิเคราะห์ข้อมูลเบาะแสส่อทุจริต ประกอบด้วย 3 ส่วนหลัก

```
Google Sheets  →  Excel (.xlsx)  →  PostgreSQL  →  Backend API  →  Frontend (React)
   (source)        (local file)      (database)    (port 3001)     (port 5173)
```

---

## Repositories

| Repo | Path | คำอธิบาย |
|---|---|---|
| Frontend | `C:\Users\rakpa\AppMustshare` | React + Vite |
| Backend | `C:\Users\rakpa\Backend_AppMustshare` | Node.js + Express |

---

## Data Flow — Excel → Database

### ไฟล์ Excel
**Path:** `C:\Users\rakpa\Backend_AppMustshare\data_for_database\cases_import_0.2.xlsx`

| Sheet | คำอธิบาย |
|---|---|
| `cases` | ข้อมูลเคสหลัก (1 row = 1 เคส) |
| `agencydata` | ข้อมูลหน่วยงานทั้งหมด |
| `related_agencies` | ความเชื่อมโยงเคส ↔ หน่วยงาน |
| `timeline` | ไทม์ไลน์สถานะของแต่ละเคส |
| `related_persons` | บุคคลที่เกี่ยวข้องกับแต่ละเคส |

### Import Scripts (รันใน Backend_AppMustshare/)

```bash
node import_agencies.js   # sync agencydata sheet → agencies table (ทำก่อนเสมอ)
node import_cases.js      # sync cases/related_agencies/timeline/related_persons → cases table
```

**พฤติกรรม:**
- INSERT เคส/หน่วยงานใหม่
- UPDATE เคส/หน่วยงานที่มีอยู่แล้ว
- DELETE เคส/หน่วยงานที่ถูกลบออกจาก Excel

**Options:**
```bash
node import_cases.js --dry-run     # ดูผลโดยไม่บันทึกจริง
node import_cases.js myfile.xlsx   # ระบุไฟล์เอง
```

### Column Mapping ที่สำคัญ (cases sheet)

| Excel Column | DB Column | หมายเหตุ |
|---|---|---|
| `case_id` | `cases.id` | Primary key |
| `visibility Level` | `cases.person_visibility` | ควบคุมการมองเห็น related person (ไม่ใช่ case) |
| (hardcode) | `cases.visibility` | = `'Internal'` เสมอ |
| `data_source_act_ai` | `cases.documents[]` | type: Link, name: "โครงการจาก ACT AI" |
| `data_source_egp` | `cases.documents[]` | type: Link, name: "โครงการจาก e-GP" |
| `data_source_other` | `cases.documents[]` | type: Link, name: "ข้อมูลโครงการ" |
| related_persons sheet | `cases.related_person1/2` | รวม name + position |

---

## Database (PostgreSQL — mustshare)

### Tables

| Table | คำอธิบาย | จำนวน (approx) |
|---|---|---|
| `cases` | เคสทุจริตทั้งหมด | ~58 rows |
| `agencies` | หน่วยงานทั้งหมด | ~9,197 rows |
| `users` | ผู้ใช้ระบบ | - |
| `logs` | บันทึกกิจกรรมในระบบ | - |
| `th_regions` | ข้อมูลภาค | - |
| `th_provinces` | ข้อมูลจังหวัด | - |
| `th_districts` | ข้อมูลอำเภอ | - |
| `th_sub_districts` | ข้อมูลตำบล | - |

### cases Table — คอลัมน์สำคัญ

| Column | Type | คำอธิบาย |
|---|---|---|
| `id` | text | PK เช่น `case-0001` |
| `visibility` | text | `Internal` (ทุก role เห็น) / `Restricted` (admin/coordinator เท่านั้น) |
| `person_visibility` | text | `Internal` / `Restricted` — ควบคุมการมองเห็น related_person1/2 |
| `related_agencies` | jsonb | `[{agencyId, agencyRole}]` |
| `documents` | jsonb | `[{type, name, url, access}]` |
| `timeline` | jsonb | `[{date, status, note?}]` |
| `notes` | jsonb | `[{name, date, text}]` |
| `activity_log` | jsonb | `[{date, name, action, role}]` |

---

## Backend API (Node.js + Express — port 3001)

### Entry Points
- `src/index.js` — start server
- `src/app.js` — express app, mount routes
- `src/db/pool.js` — PostgreSQL connection pool
- `src/middleware/auth.js` — JWT authentication, role checking

### API Endpoints

**Auth** `/api/auth`
| Method | Path | Role | คำอธิบาย |
|---|---|---|---|
| POST | `/login` | public | เข้าสู่ระบบ, คืน JWT token |
| GET | `/me` | all | ดูข้อมูล user ปัจจุบัน |

**Cases** `/api/cases`
| Method | Path | Role | คำอธิบาย |
|---|---|---|---|
| GET | `/` | all | ดูรายการเคส (user เห็นเฉพาะ Internal) |
| GET | `/:id` | all | ดูรายละเอียดเคส |
| POST | `/` | all | สร้างเคสใหม่ |
| PUT | `/:id` | all | แก้ไขเคส |
| DELETE | `/:id` | admin | ลบเคส |
| POST | `/:id/request-delete` | all | ขอลบเคส |
| POST | `/:id/approve-delete` | admin | อนุมัติการลบ |
| POST | `/:id/reject-delete` | admin | ปฏิเสธการลบ |

**Agencies** `/api/agencies`
| Method | Path | Role | คำอธิบาย |
|---|---|---|---|
| GET | `/` | all | ดูรายการหน่วยงาน |
| GET | `/:id` | all | ดูรายละเอียดหน่วยงาน |
| POST | `/` | admin | สร้างหน่วยงาน |
| PUT | `/:id` | admin | แก้ไขหน่วยงาน |
| DELETE | `/:id` | admin | ลบหน่วยงาน |

**Users** `/api/users`
| Method | Path | Role | คำอธิบาย |
|---|---|---|---|
| GET | `/` | all | ดูรายการผู้ใช้ |
| GET | `/:id` | all | ดูรายละเอียดผู้ใช้ |
| POST | `/` | admin | สร้างผู้ใช้ |
| PUT | `/:id` | admin | แก้ไขผู้ใช้ |
| POST | `/:id/reset-password` | admin | รีเซ็ตรหัสผ่าน |
| POST | `/:id/change-password` | self | เปลี่ยนรหัสผ่านตัวเอง |
| DELETE | `/:id` | admin | ลบผู้ใช้ |

**Logs** `/api/logs` — บันทึกกิจกรรม

**Geography** `/api/geography` — ข้อมูลจังหวัด/อำเภอ/ตำบล

### User Roles

| Role | สิทธิ์ |
|---|---|
| `admin` | ทำได้ทุกอย่าง รวมถึงลบ/จัดการ user |
| `coordinator` | แก้ไขเคส/หน่วยงานได้ เห็น Restricted persons |
| `user` | ดูเฉพาะเคส Internal, ไม่เห็น Restricted persons |

---

## Frontend (React + Vite — port 5173)

### Pages & Routes

| Route | Component | คำอธิบาย |
|---|---|---|
| `/login` | `Login.jsx` | หน้าเข้าสู่ระบบ |
| `/dashboard` | `Dashboard.jsx` | ภาพรวม + แผนที่ประเทศไทย |
| `/cases` | `caselist.jsx` | รายการเคสทั้งหมด |
| `/cases/create` | `createcase.jsx` | สร้างเคสใหม่ |
| `/cases/:id` | `casedetail.jsx` | รายละเอียดเคส + แก้ไข |
| `/agencies` | `agencylist.jsx` | รายการหน่วยงาน |
| `/agencies/create` | `createagency.jsx` | สร้างหน่วยงาน |
| `/agencies/:id` | `agencydetail.jsx` | รายละเอียดหน่วยงาน |
| `/activity-log` | `activitylog.jsx` | บันทึกกิจกรรม |
| `/users` | `Users.jsx` | จัดการผู้ใช้ |
| `/users/create` | `createuser.jsx` | สร้างผู้ใช้ |
| `/users/:id` | `userdetail.jsx` | รายละเอียดผู้ใช้ |
| `/delete-requests` | `deleterequests.jsx` | คำขอลบเคส |

### Context (Global State)

| Context | ไฟล์ | ข้อมูลที่จัดการ |
|---|---|---|
| `AuthContext` | `context/AuthContext.jsx` | JWT token, login/logout, user payload |
| `UserContext` | `context/UserContext.jsx` | role, ชื่อ, role label ของ user ปัจจุบัน |
| `CasesContext` | `context/CasesContext.jsx` | รายการเคสทั้งหมด, CRUD operations |
| `AgencyContext` | `context/AgencyContext.jsx` | รายการหน่วยงาน, CRUD operations |
| `UsersContext` | `context/UsersContext.jsx` | รายการ users, CRUD operations |
| `SystemLogContext` | `context/SystemLogContext.jsx` | บันทึก activity log |

### Components

| Component | คำอธิบาย |
|---|---|
| `components/Layout.jsx` | Layout หลัก (sidebar + content area) |
| `components/Sidebar.jsx` | เมนูด้านซ้าย |

### Auth Flow

```
Login → POST /api/auth/login → JWT token → localStorage (mustshare_token)
→ parseToken() → user payload (id, email, role, name)
→ ทุก API request แนบ Authorization: Bearer <token>
→ 401 response → clearToken + redirect /login
```

---

## Auto-Sync (Excel Watch)

```bash
# รันใน Backend_AppMustshare/
node watch_excel.js        # watch ไฟล์ Excel แล้ว import อัตโนมัติเมื่อไฟล์เปลี่ยน
start_watcher.bat          # เปิด watcher ผ่าน bat file
```

---

## ขั้นตอนอัปเดตข้อมูลจาก Google Sheets

1. แก้ไขข้อมูลใน Google Sheets
2. Export / ดาวน์โหลดเป็น Excel ไปที่ `data_for_database/cases_import_0.2.xlsx`
3. รัน:
   ```bash
   cd C:\Users\rakpa\Backend_AppMustshare
   node import_agencies.js
   node import_cases.js
   ```
4. Refresh หน้าเว็บ
