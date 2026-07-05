# HRM — Multi-tenant Implementation Plan

> Ngày chốt: 2026-07-05. Cập nhật khi có thay đổi lớn.

---

## 1. Scope & Quyết định đã chốt

### 1.1 Scope tổng thể
**Option B — Standard VN**: Nhóm A (Employee + Organization + Attendance + Leave) + Payroll VN đầy đủ (BHXH/BHYT/BHTN + thuế TNCN).

### 1.2 Quyết định kiến trúc

| # | Quyết định | Chốt |
|---|---|---|
| 1 | Multi-tenant | Có, shared DB + shared schema (`companyId` per row) |
| 2 | User membership | 1 user thuộc **1 tenant duy nhất** (không multi-tenant per user) |
| 3 | Cách nhận biết tenant | **Path routing** `/:companyCode/*` (tạm thời). Sau khi xong dự án đổi sang **subdomain** `<code>.hrm.com`. Backend agnostic — chỉ đọc `companyId` từ JWT nên chuyển đổi chỉ ảnh hưởng FE + Nginx. |
| 4 | Super admin | Có, tách biệt platform owner (`companyId = NULL`) khỏi tenant admin |
| 5 | Signup tenant | **Public** — mở đăng ký công khai với gói **trial 14 ngày** (status `trial`) |
| 6 | Employee code | **Tenant tự set prefix** (VD: FPT001, VNG001) — chuyên nghiệp, custom được |
| 7 | Seed dữ liệu mẫu | Có, làm sau Sprint 1 (1 tenant demo + 10 nhân viên) |
| 8 | Payroll VN | Đủ BHXH 8% / BHYT 1.5% / BHTN 1% + thuế TNCN 7 bậc + giảm trừ bản thân/người phụ thuộc |

### 1.3 Giả định defaults (không cần user confirm lại)
- Nội bộ 1 công ty per tenant (multi-branch trong cùng tenant OK)
- Quy mô mục tiêu: 50–500 NV per tenant
- Chấm công qua **web** (check-in browser), ca fixed (không kíp xoay phức tạp)

---

## 2. Stack

| Layer | Công nghệ |
|---|---|
| Backend | Node.js + Express 5 + Sequelize + PostgreSQL, ESM |
| Auth | JWT (30m Bearer) + refresh token (14d httpOnly cookie) + Session table |
| Frontend | React 19 + TypeScript + Vite + Tailwind v4 + shadcn (new-york) |
| State | Zustand + persist |
| Form | react-hook-form + zod |
| HTTP | axios (auto refresh interceptor) |
| Icons | lucide-react |
| Toast | sonner |

---

## 3. Danh sách bảng — 30 bảng tổng

### 3.1 GLOBAL (không có `companyId`) — 6 bảng
| Bảng | Mô tả |
|---|---|
| `companies` | Danh sách tenant |
| `users` | `companyId` nullable — NULL với super_admin |
| `sessions` | Refresh token store |
| `insurance_rates` | Tỷ lệ BHXH/BHYT/BHTN theo năm (luật VN chung) |
| `tax_brackets` | Bậc thuế TNCN (7 bậc) |
| `personal_deduction_rates` | Giảm trừ bản thân (11tr) + người phụ thuộc (4.4tr) |

### 3.2 PER-TENANT (có `companyId` NOT NULL + composite index) — 24 bảng

**Organization (4)**: `branches`, `departments`, `positions`, `levels`

**Employee (7)**: `employees`, `employee_positions` (lịch sử vị trí), `employee_dependents`, `employee_educations`, `employee_experiences`, `employee_documents`, `contracts`

**Attendance (3)**: `shifts`, `work_schedules`, `attendances`

**Leave (3)**: `leave_types`, `leave_balances`, `leave_requests`

**Payroll (5)**: `salary_structures` (versioned), `allowances`, `employee_allowances`, `payrolls`, `payroll_items`

**Cross-cutting (3)**: `notifications`, `audit_logs`, `company_configs` (Sprint 4 — key-value settings per tenant, học từ KojiCRM)

---

## 4. Schema — Bảng nền tảng chi tiết

### 4.1 `companies`
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | INT PK auto | |
| code | VARCHAR(50) UNIQUE | slug — path & subdomain |
| name | VARCHAR(255) NOT NULL | Tên công ty |
| taxCode | VARCHAR(20) | MST doanh nghiệp |
| address | TEXT | |
| contactEmail | VARCHAR(255) | |
| contactPhone | VARCHAR(20) | |
| status | ENUM('trial','active','suspended') | Default `trial` |
| trialEndsAt | DATE nullable | +14 ngày kể từ signup |
| employeeCodePrefix | VARCHAR(10) | VD: "FPT" — dùng gen mã NV |
| createdAt / updatedAt | TIMESTAMP | |

### 4.2 `users` — cập nhật
Thêm/đổi:
- `companyId` INT NULL — FK → `companies.id` CASCADE
- `role` ENUM thêm `super_admin`: `super_admin | admin | hr | manager | employee`
- Constraint (application layer): super_admin ↔ companyId NULL; các role khác ↔ companyId NOT NULL

### 4.3 Roles & Quyền

| Role | Scope | Ví dụ hành động |
|---|---|---|
| `super_admin` | Platform (companyId=NULL) | Xem/tạo/khóa tenant, quản lý platform |
| `admin` | 1 tenant | Config tenant, quản trị mọi module |
| `hr` | 1 tenant | Quản lý NV, chấm công, tính lương |
| `manager` | 1 tenant + theo phòng ban | Duyệt phép, xem NV cấp dưới |
| `employee` | 1 tenant + chỉ mình | Xem hồ sơ mình, xin nghỉ, xem payslip |

---

## 5. Auth Flow (Multi-tenant)

### 5.1 Signup tenant mới (public)
1. User điền form: `{companyName, companyCode, taxCode, adminName, adminEmail, password, employeeCodePrefix}`
2. Backend: tạo `companies` (status=trial, trialEndsAt=+14d) → tạo `users` (role=admin, companyId) → issue JWT
3. FE redirect `/<code>/dashboard`

### 5.2 Signin (tất cả role thường)
- User nhập `email + password` (không cần chọn tenant vì 1 user = 1 tenant)
- Backend verify → JWT payload `{userId, companyId, role}` + refresh token cookie
- FE redirect `/<code>/dashboard`

### 5.3 Super admin
- **Không** signup qua UI public
- Seed 1 super_admin qua CLI script: `npm run seed:super-admin` (env: `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`)
- Signin dùng chung endpoint `/api/auth/signin` — check role sau khi verify

### 5.4 Middleware chain
```
protectedRoute (verify JWT)
  → tenantMiddleware (inject req.companyId từ JWT, chặn nếu thiếu — trừ super_admin)
    → requireRole('admin', 'hr') [nếu cần]
      → controller
```

### 5.5 Data isolation
- **Bắt buộc:** mọi query Sequelize trên bảng nghiệp vụ phải có `where: { companyId: req.companyId, ... }`
- **Helper:** viết `scopeToCompany(req)` trả về base `where` — controllers dùng để tránh quên
- **Sprint 4 sẽ thêm PostgreSQL Row-Level Security (RLS)** làm defense-in-depth ở DB layer — kể cả app code có bug quên filter, RLS chặn được (xem [§6 Sprint 4](#sprint-4--polish)).

---

## 6. Sprint Plan

### Sprint 0 — Multi-tenant Foundation ⏭️ NEXT
**Deliverables:**
- BE: `companies` model, cập nhật `users` model (thêm companyId + role super_admin)
- BE: `tenantMiddleware`, `scopeToCompany` helper
- BE: Auth flow mới — `POST /api/auth/signup-tenant` (public), `POST /api/auth/signin` (giữ), signout, refresh
- BE: Script seed super_admin
- FE: Routing `/:companyCode/*` (React Router), parse companyCode, guard
- FE: Signup tenant page (form đăng ký cty + admin)
- FE: Signin page (đơn giản, redirect vào `/:code/dashboard`)
- FE: Auth store cập nhật lưu `companyCode` + `role` + `companyId`
- FE: Sidebar layout base có tên công ty + logout

**Done khi:** Đăng ký được 1 tenant mới, login vào dashboard rỗng, super_admin login được vào view riêng.

### Sprint 1 — Organization + Employee
**Deliverables:**
- BE: models `branches`, `departments`, `positions`, `levels`, `employees`, `employee_positions`, `contracts`, `employee_dependents`, `employee_educations`, `employee_experiences`, `employee_documents`
- BE: CRUD API cho từng bảng, có phân quyền (admin/hr full, manager xem, employee xem mình)
- BE: Logic gen mã NV theo prefix của tenant
- FE: Trang danh sách + form CRUD cho: chi nhánh, phòng ban, chức danh, cấp bậc, nhân viên
- FE: Trang chi tiết nhân viên (tabs: thông tin, hợp đồng, gia đình, học vấn, kinh nghiệm)
- **Seed sau S1:** 1 tenant demo + 10 NV mẫu

**Done khi:** Tạo được 1 phòng ban, 1 chức danh, add 1 nhân viên đầy đủ thông tin.

### Sprint 2 — Attendance + Leave
**Deliverables:**
- BE: models `shifts`, `work_schedules`, `attendances`, `leave_types`, `leave_balances`, `leave_requests`
- BE: API check-in/check-out (employee), duyệt phép (manager/hr)
- BE: Logic tính hoursWorked, otHours, cập nhật leave_balance
- FE: Trang chấm công NV (check-in button + lịch sử)
- FE: Trang xin nghỉ + trang duyệt (manager)
- FE: Bảng chấm công tháng (HR view)

**Done khi:** NV check-in được, xin nghỉ được, manager duyệt được, HR xem báo cáo tháng.

### Sprint 3 — Payroll VN
**Deliverables:**
- BE: seed `insurance_rates`, `tax_brackets`, `personal_deduction_rates` theo luật hiện hành
- BE: models `salary_structures`, `allowances`, `employee_allowances`, `payrolls`, `payroll_items`
- BE: Engine tính lương: gross → BH → thuế TNCN → net (dùng attendance + salary_structure + allowances + dependents)
- BE: API generate bảng lương tháng, finalize, mark paid
- FE: Trang cấu hình lương NV
- FE: Trang generate + xem bảng lương tháng (HR)
- FE: Trang payslip cá nhân NV

**Done khi:** Generate bảng lương tháng cho 10 NV, khớp công thức VN. NV xem được payslip mình.

### Sprint 4 — Polish
**Deliverables:**
- BE: `notifications` (in-app, log DB), gửi khi duyệt phép / payslip mới
- BE: `audit_logs` middleware, track update trên bảng nhạy cảm (payrolls, salary_structures, users)
- BE: **PostgreSQL Row-Level Security (RLS)** — hardening isolation ở tầng DB
  - Enable RLS trên tất cả bảng per-tenant (24 bảng)
  - Policy: `USING (company_id = current_setting('app.current_company_id')::int)`
  - Middleware set `SET LOCAL app.current_company_id` mỗi request (sau tenantMiddleware)
  - Kể cả app code có bug quên filter `companyId`, RLS vẫn chặn ở DB layer
  - Test: viết integration test tenant A cố query tenant B → PostgreSQL trả 0 row
- BE: `company_configs` — bảng key-value settings per tenant (học từ KojiCRM `config_company`)
  - Schema: `(id, companyId, key VARCHAR(100), value TEXT, updatedAt)` + UNIQUE `(companyId, key)`
  - Service `getConfig(companyId, key)` + `setConfig(companyId, key, value)` có cache in-memory (invalidate khi update)
  - Use cases: SMTP config riêng tenant, logo/favicon whitelabel, quota (`maxEmployees`, `maxBranches`), feature flags bật/tắt module
- BE: Upload path convention `uploads/{companyId}/{module}/{filename}` — isolation asset per tenant (dù dùng local disk hay S3 prefix)
- FE: Notification bell trong header
- FE: Audit log viewer (super_admin + admin xem)
- FE: Dashboard tổng quan có số liệu thật
- FE: Trang cấu hình tenant (áp SMTP, logo, feature flags) — dùng `company_configs`

**Done khi:** Bell hiện thông báo real, audit log xem được, dashboard hiển thị metric, tenant tự chỉnh được logo + config email qua UI.

---

## 7. Guardrails & Convention

### 7.1 Multi-tenant safety
- **NEVER** viết Sequelize query không filter `companyId` trên bảng per-tenant
- **Code review checklist:** grep các file controller — mọi `findAll/findOne/create/update` phải có `companyId` (trừ super_admin path)
- **Helper bắt buộc:** dùng `scopeToCompany(req)` thay vì viết tay `{ companyId: req.companyId }` — dễ soi hơn

### 7.2 Chuyển đổi Path → Subdomain (sau khi xong dự án)
- FE routing: đổi từ `useParams()` sang parse `window.location.hostname`
- Nginx wildcard subdomain `*.hrm.com` → route hết về app
- Backend: 0 thay đổi (đã đọc từ JWT)
- Bảng `companies.code` giữ nguyên — cùng slug dùng cho cả path và subdomain

### 7.3 Payroll immutability
- Khi `payrolls.status = 'finalized'`: không cho UPDATE trực tiếp
- Muốn sửa → API `unlock` (chỉ admin, có audit log) → về `draft` → sửa → finalize lại

### 7.4 Salary versioning
- `salary_structures` không UPDATE — tăng lương = tạo record mới với `effectiveFrom` mới
- Query lương tháng X = lấy salary_structure có `effectiveFrom <= endOfMonthX AND (effectiveTo IS NULL OR effectiveTo >= startOfMonthX)`

---

## 8. Open Questions (chưa cần chốt bây giờ, quyết khi tới)

- **Billing/subscription:** hiện chưa có, tenant trial 14 ngày rồi để tự expire. Cần khi go live.
- **Email service:** hiện chưa gửi email — reset password, invite, notification qua email. Chưa quyết dùng SendGrid/Resend/SES.
- **File upload storage:** hồ sơ NV có CV, ảnh CCCD… Chưa quyết local disk / S3 / Cloudinary. (Path convention đã chốt: `uploads/{companyId}/{module}/...` — chỉ chờ chốt storage backend.)
- **Test framework:** chưa có. Khi cần: BE Supertest, FE Vitest. RLS integration test (Sprint 4) chắc chắn cần → có thể là lý do bắt buộc setup Supertest.

---

## 9. Trạng thái hiện tại

- ✅ Base FE (Vite + React 19 + Tailwind v4 + shadcn primitives + auth store + login/signup page)
- ✅ Base BE (Express 5 + Sequelize + PostgreSQL + JWT + Session + User model đơn giản)
- ⏭️ **Next: Sprint 0** — Multi-tenant foundation
