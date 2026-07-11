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

## 3. Danh sách bảng — 31 bảng tổng

> 📄 Schema chi tiết từng bảng + ER diagram: xem [DB_SCHEMA.md](DB_SCHEMA.md).

### 3.1 GLOBAL (không có `companyId`) — 6 bảng
| Bảng | Mô tả |
|---|---|
| `companies` | Danh sách tenant |
| `users` | `companyId` nullable — NULL với super_admin |
| `sessions` | Refresh token store |
| `insurance_rates` | Tỷ lệ BHXH/BHYT/BHTN theo năm (luật VN chung) |
| `tax_brackets` | Bậc thuế TNCN (7 bậc) |
| `personal_deduction_rates` | Giảm trừ bản thân (15.5tr từ 2026-07-01) + người phụ thuộc (6.2tr) |

### 3.2 PER-TENANT (có `companyId` NOT NULL + composite index) — 25 bảng

**Organization (4)**: `branches`, `departments`, `positions`, `levels`

**Employee (8)**: `employees`, `employee_positions` (lịch sử vị trí), `contracts`, `employee_dependents` (giảm trừ thuế), `emergency_contacts` (liên hệ khẩn cấp), `employee_educations`, `employee_experiences`, `employee_documents`

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
- BE: 12 models — `branches`, `departments`, `positions`, `levels`, `employees`, `employee_positions`, `contracts`, `employee_dependents`, `emergency_contacts`, `employee_educations`, `employee_experiences`, `employee_documents`
- BE: CRUD API + phân quyền (admin/hr full, manager xem cấp dưới, employee xem mình)
- BE: Auto gen mã NV `{prefix}{NNN}` (FPT001) trong transaction lock
- BE: API "Cấp tài khoản đăng nhập" — tạo user + link `employees.userId` (nullable) sau khi đã có employee
- FE: Sidebar dọc trái, nhóm collapsible ("Tổ chức", "Nhân sự")
- FE: Trang list + form CRUD cho chi nhánh, phòng ban, chức danh, cấp bậc, nhân viên
- FE: Employee list — filter đầy đủ (search tên/code, phòng ban, chi nhánh, trạng thái) + pagination
- FE: Employee detail dạng tabs — Thông tin | Vị trí | Hợp đồng | Người phụ thuộc | Liên hệ khẩn cấp | Học vấn | Kinh nghiệm | Tài liệu
- Seed sau S1: 1 tenant demo + 10 NV mẫu

**Design decisions (chốt):**
- **Employee code:** `{prefix}{NNN}` — FPT001, FPT002 (không có year, gen trong transaction lock)
- **`employees.identityNumber` (CCCD)** unique per tenant — chống trùng CCCD trong 1 công ty
- **`employees.userId` nullable** — mặc định NV mới không có tài khoản login. HR bấm "Cấp tài khoản" trên trang chi tiết → hệ thống tạo user + link. Ràng buộc: UNIQUE `employees.userId` (1 user chỉ gắn 1 NV)
- **`employee_documents.fileUrl`** = string thuần trong S1 (paste URL) — upload thật làm mini-sprint sau
- **Storage backend chốt: Cloudflare R2** (S3-compatible, zero egress fee) — setup ở mini-sprint "R2 integration" sau S1
- **Emergency contacts:** bảng riêng `emergency_contacts` (không gộp với `employee_dependents` do khác semantics)
- **Sidebar UI:** dọc trái, nhóm collapsible
- **Employee list:** full filter (search + department + branch + status)
- **Employee detail:** dạng tabs

**Done khi:** Tạo được 1 phòng ban + 1 chức danh + 1 chi nhánh, add 1 nhân viên đầy đủ thông tin qua UI, cấp tài khoản login cho NV được, filter/search employee list hoạt động.

**Sprint 1 polish backlog** (làm cuối Sprint 1 sau khi Batch D xong):

*Bug cần kiểm tra lại:*
- Checkbox `<input type="checkbox">` binding khi mở edit form (4 pages org) — verify reflect đúng giá trị đã lưu
- Nested dialogs: mở edit form + bấm xóa từ dropdown khi đang mở → check có glitch không
- Native `<select>` trong dark mode — CSS bg-background hoặc chuyển Radix Select (cần cài `@radix-ui/react-select`)

*Features còn thiếu:*
- Chọn Manager cho Branch/Department (dropdown employees) — cần Employee UI xong trước
- Search box trong list (client-side, debounce 300ms)
- Sort by column header
- Pagination client-side (nếu >50 rows/page)
- Toggle active/inactive nhanh từ table row (không cần mở form)
- Bulk delete (checkbox chọn nhiều + toolbar xóa đã chọn)

*Design polish:*
- Dashboard trang chủ hiển thị số liệu thật (fetch org counts)
- Sidebar collapse mode (icon-only, useState toggle)
- Breadcrumb trên header (Tổ chức > Chi nhánh > Chi tiết)
- Toast undo 5s sau delete
- Wrap Shadcn Switch component thay `<input type="checkbox">`
- **Check-in mobile GPS + selfie** — nâng cấp attendance từ 1-click browser sang mobile app (Sprint 3+ nếu có budget mobile)

### Sprint 2 — Attendance + Leave
**Deliverables:**
- BE: 6 models — `shifts`, `work_schedules`, `attendances`, `leave_types`, `leave_balances`, `leave_requests`
- BE: Thêm cột `companies.workingDays` JSONB (config ngày làm việc per tenant)
- BE: API check-in/check-out (employee), workflow duyệt phép 2 stage (manager → HR)
- BE: Logic tính hoursWorked, otHours (auto khi check-out), cập nhật leave_balance
- BE: Auto seed 6 loại phép chuẩn khi tạo tenant mới (ANNUAL, SICK, MATERNITY, MARRIAGE, BEREAVEMENT, UNPAID)
- BE: Cron job (hoặc endpoint HR trigger) mark absent cuối ngày
- FE: Trang chấm công NV (check-in button + lịch sử tháng)
- FE: Trang xin nghỉ NV (form + lịch sử + hiển thị số phép còn)
- FE: Trang duyệt phép (Manager) — chỉ thấy NV thuộc phòng ban mình quản lý
- FE: Trang duyệt phép (HR) — thấy toàn tenant, chỉ những request đã manager approved
- FE: Bảng chấm công tháng (HR view)

**Design decisions (chốt):**
- **Check-in security:** 1-click button, log IP. GPS + selfie mobile app đưa vào backlog Sprint 3+
- **Attendance auto-status:** cron cuối ngày mark `absent`, tính `hoursWorked/otHours` khi check-out
- **OT auto:** khi check-out > shift.endTime + tolerance 15 phút
- **Workflow leave:** 3 stage — Employee submit (`pending`) → Manager approve (`manager_approved`) → HR approve (`approved`). Bất kỳ tầng nào cũng có thể `rejected`.
- **Admin override (Duyệt vượt cấp):** Chuẩn industry (BASE.vn, MISA AMIS, BambooHR đều có) — chỉ admin thấy thêm nút **"Duyệt trực tiếp"** bên cạnh "Duyệt". Bấm 1 click → đơn về `approved` ngay, bypass cả 2 tầng. Cả `managerApprovedBy` và `hrApprovedBy` đều ghi admin (audit trail rõ). Endpoint `POST /leave-requests/:id/direct-approve` (chỉ role=admin). Nút "Duyệt" thường vẫn theo workflow đúng tầng.
- **Manager của NV:** = user (role=manager) là `departments.managerId` của phòng NV đang thuộc
- **workingDays per tenant:** `companies.workingDays` JSONB `{mon:1,tue:1,wed:1,thu:1,fri:1,sat:0,sun:0}`. Cho phép nửa ngày (0.5 với sat/sun tùy công ty).
- **Nghỉ nửa ngày:** `leave_requests.halfDay` ENUM `null | morning | afternoon`, cần `fromDate = toDate`
- **6 loại phép seed:** ANNUAL 12 ngày, SICK unlimited (có giấy BS), MATERNITY 180 ngày, MARRIAGE 3, BEREAVEMENT 3, UNPAID unlimited không lương

**Done khi:** NV check-in được, xin nghỉ được, manager duyệt được, HR duyệt lần 2 được, HR xem báo cáo tháng, workingDays cấu hình được per tenant.

### Sprint 3 — Payroll VN
**Deliverables:**
- BE: seed `insurance_rates`, `tax_brackets`, `personal_deduction_rates` theo luật hiện hành
- BE: models `salary_structures`, `allowances`, `employee_allowances`, `payrolls`, `payroll_items`
- BE: Engine tính lương: gross → BH → thuế TNCN → net (dùng attendance + salary_structure + allowances + dependents)
- BE: API generate bảng lương tháng, finalize, mark paid
- FE: Trang cấu hình lương NV
- FE: Trang generate + xem bảng lương tháng (HR)
- FE: Trang payslip cá nhân NV
- FE: Export CSV bảng lương + PDF payslip

**Design decisions (chốt Sprint 3):**
- **BHXH salary cap:** theo luật — 20× lương tối thiểu vùng (config được trong `insurance_rates`)
- **Số ngày công chuẩn:** tính từ `companies.workingDays` (Sprint 2) — sum weight của các ngày trong tháng
- **OT rate:** 150% cố định (chuẩn VN 200%/300% cho CN/lễ đưa vào Sprint 4)
- **Non-taxable allowance:** field `isTaxable` boolean. HR tự chuẩn max exempt (không auto cap)
- **Allowance calculation:** chỉ fixed amount (percentage đưa vào backlog)
- **Attendance impact:** `lương thực nhận = basicSalary × (ngày công thực / ngày công chuẩn)`. Ngày phép có lương tính đủ, phép không lương/vắng trừ 1 công
- **Bonus:** HR input manual thêm vào `payroll_items` type=`bonus`
- **Payroll status flow:** `draft` → `finalized` → `paid` (finalized khóa; muốn sửa phải unlock có audit)
- **Payslip:** show full breakdown (gross, từng allowance, insurance chi tiết, tax, net)
- **Export:** CSV bảng lương tháng + PDF payslip cá nhân

**Done khi:** Generate bảng lương tháng cho 10 NV, khớp công thức VN. NV xem được payslip mình. Export CSV OK.

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
- **File upload:** Storage backend đã chốt **Cloudflare R2** (S3-compatible, zero egress fee). Path convention: `uploads/{companyId}/{module}/...`. Chưa build — làm mini-sprint "R2 integration" sau Sprint 1 (cài `@aws-sdk/client-s3`, config `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` trong .env).
- **Test framework:** chưa có. Khi cần: BE Supertest, FE Vitest. RLS integration test (Sprint 4) chắc chắn cần → có thể là lý do bắt buộc setup Supertest.

---

## 9. Trạng thái hiện tại

- ✅ Base FE + BE + DB PostgreSQL sync xong
- ✅ **Sprint 0 done** — Multi-tenant foundation (companies, users, sessions, auth flow signup-tenant/signin/signout/refresh, super_admin seed, FE routing `/:companyCode/*`, TenantGuard/SuperAdminGuard/RootRedirect, TenantLayout/SuperAdminLayout, tested E2E)
- ✅ **Sprint 1 done** — Organization + Employee (BE 12 models + FE 4 org pages + Employee list/detail 8 tabs + grant-account + change-position)
- ✅ **Sprint 1.5** — Dashboard real numbers
- ✅ **Sprint 1.6** — Cloudflare R2 upload (presigned URL, Content-Disposition RFC 5987)
- ✅ **Sprint 2 done** — Attendance + Leave (BE 6 models + workflow 3-tier NV → Manager → HR + admin bypass direct-approve, FE chấm công + xin nghỉ + duyệt + báo cáo tháng)
- ✅ **Sprint 3 Batch A** — BE Payroll references (3 global + 3 per-tenant models, CRUD, seed script)
- ✅ **Sprint 3 Batch B** — BE Payroll Engine (payrolls + payroll_items models, `computePayroll` engine với progressive PIT + BHXH cap + attendance-driven proration, 9 endpoints, workflow draft/finalized/paid + unlock)
- ✅ **Sprint 3 Batch C** — FE Config (AllowancesPage + SalaryConfigPage với versioned view + PayrollReferencesPage read-only)
- ✅ **Sprint 3 Batch D** — FE Payroll (PayrollListPage với filter + preview dialog + generate + export CSV, PayrollDetailPage, MyPayslipPage, shared PayslipView)
- ✅ Bug fixes: F5 race condition access token, axios interceptor retry 401, CORS localhost multiport, hasEmployee flag, R2 filename từ extension key
- ✅ Seed data mẫu: 16 branches, 28 departments (3-cấp tree), 24 positions, 10 levels — script `npm run seed:org`
- ✅ Seed payroll refs: NĐ 293/2025 (min wage 2026 tăng 7.2%), NQ 110/2025 (giảm trừ 15.5M/6.2M từ 2026-07-01), 7 bậc PIT

**Roadmap tiếp theo:**
1. ⏭️ **Sprint 4 — Polish** — notifications, audit_logs, RLS PostgreSQL, company_configs (theo §6 Sprint 4)
2. ⏭️ Backlog: hợp đồng-lương consistency warning banner, sort/pagination/search polish (Sprint 1 backlog §6), PDF payslip generator, OT 200%/300% CN/lễ
3. ⏭️ Test framework setup (Vitest + Supertest) — chưa có test, cần trước khi go-live

Schema xem [DB_SCHEMA.md](DB_SCHEMA.md).
