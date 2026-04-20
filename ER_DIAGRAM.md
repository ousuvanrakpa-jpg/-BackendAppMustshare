# AppMustshare — ER Diagram (Current System)

> อัปเดตจาก ER diagram เดิม ให้ตรงกับ database จริง (PostgreSQL)
> สร้างจาก: `node import_agencies.js` + `node import_cases.js`

---

## Mermaid Diagram

วิธีดู: วางโค้ดนี้ใน https://mermaid.live หรือเปิดใน draw.io (Extras → Edit Diagram)

```mermaid
erDiagram

    %% ════════════════════════════════
    %%  CORE TABLES
    %% ════════════════════════════════

    USERS {
        text    id          PK
        text    name
        text    email       UK
        text    password
        text    role        "admin | coordinator | user"
        text    status      "Active | Inactive"
        text    created_at
    }

    CASES {
        text    id                  PK  "case-0001"
        text    agency_id           FK
        text    title
        text    agency              "denorm copy from agencies"
        text    category
        text    sub_category
        text    procurement_method
        text    status
        text    date
        text    budget
        text    source
        text    last_updated
        text    visibility          "Internal | Restricted"
        text    person_visibility   "Internal | Restricted"
        text    restricted_notes
        text    description
        text    agency_type
        text    agency_role
        text    region
        text    province
        text    district
        text    sub_district
        text    related_person1
        text    related_person2
        text    project_type
        jsonb   related_agencies    "[ {agencyId, agencyRole} ]"
        jsonb   documents           "[ {type, name, url, access} ]"
        jsonb   timeline            "[ {date, status, note?} ]"
        jsonb   notes               "[ {name, date, text} ]"
        jsonb   activity_log        "[ {date, name, action, role} ]"
        jsonb   pending_delete
    }

    AGENCIES {
        text    id          PK  "CEN-0001 / LOC-0001 / DO-0001"
        text    name
        text    type_code
        text    subtype_code
        text    region
        text    province
        text    district
        text    subdistrict
        integer cases       "case count (computed)"
        text    logo
    }

    LOGS {
        integer id          PK
        text    date
        text    name
        text    role
        text    action
        text    entity_type "case | agency | user"
        text    entity_id
        text    entity_name
    }

    %% ════════════════════════════════
    %%  GEOGRAPHY TABLES
    %% ════════════════════════════════

    TH_REGIONS {
        integer id      PK
        text    name
        text    name_en
    }

    TH_PROVINCES {
        integer id          PK
        text    name
        text    name_en
        integer region_id   FK
    }

    TH_DISTRICTS {
        integer id          PK
        text    name
        text    name_en
        integer province_id FK
    }

    TH_SUB_DISTRICTS {
        integer id          PK
        text    name
        text    name_en
        integer district_id FK
    }

    %% ════════════════════════════════
    %%  RELATIONSHIPS
    %% ════════════════════════════════

    AGENCIES ||--o{ CASES : "agency_id (primary agency)"

    USERS ||--o{ LOGS : "records activity of"

    TH_REGIONS    ||--o{ TH_PROVINCES     : "contains"
    TH_PROVINCES  ||--o{ TH_DISTRICTS     : "contains"
    TH_DISTRICTS  ||--o{ TH_SUB_DISTRICTS : "contains"
```

---

## JSONB Embedded Structures

เนื่องจาก `cases` ใช้ JSONB แทน separate tables ข้อมูลด้านล่างนี้ **ไม่มี table จริง** แต่แสดงโครงสร้างข้อมูลภายใน

### `cases.related_agencies[]`
```
{
  agencyId:   text   → ref agencies.id
  agencyRole: text   เช่น "เจ้าของโครงการ"
}
```

### `cases.documents[]`
```
{
  type:   "Link" | "File"
  name:   text
  url:    text
  access: "Public" | "Internal" | "Restricted"
}
```

### `cases.timeline[]`
```
{
  date:   "YYYY-MM-DD"
  status: text
  note:   text  (optional)
}
```

### `cases.notes[]`
```
{
  name: text   (ผู้เขียน)
  date: "YYYY-MM-DD"
  text: text
}
```

### `cases.activity_log[]`
```
{
  date:   "YYYY-MM-DD"
  name:   text
  action: text
  role:   text
}
```

---

## เปรียบเทียบ ER เก่า vs ปัจจุบัน

| Entity ใน ER เก่า     | ปัจจุบัน                                  |
|----------------------|------------------------------------------|
| ISSUE_CATEGORY       | ❌ ไม่มี table → `cases.category` (text)  |
| ISSUE_SUBCATEGORY    | ❌ ไม่มี table → `cases.sub_category` (text) |
| CASE_STATUS          | ❌ ไม่มี table → `cases.timeline` (jsonb) |
| CASE_NOTE            | ❌ ไม่มี table → `cases.notes` (jsonb)    |
| CASE_ATTACHMENT      | ❌ ไม่มี table → `cases.documents` (jsonb)|
| CASE_AGENCY          | ❌ ไม่มี table → `cases.related_agencies` (jsonb) |
| CASE_ACTIVITY_LOG    | ❌ ไม่มี table → `cases.activity_log` (jsonb) |
| USER                 | ✅ มี → `users` table                    |
| CASE                 | ✅ มี → `cases` table (ขยายมากขึ้น)      |
| AGENCY               | ✅ มี → `agencies` table                 |
| (ไม่มี)              | ✅ เพิ่ม → `logs` table                  |
| (ไม่มี)              | ✅ เพิ่ม → `th_regions/provinces/districts/sub_districts` |
