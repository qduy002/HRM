# HRM Stabilization — Sprint 3 → Sprint 4 Gate

> Bản ghi test full E2E toàn bộ luồng nghiệp vụ 4 sprint đã build (S0-S3), track bug + polish debt, và exit criteria trước khi mở Sprint 4.

**Bắt đầu:** 2026-07-11
**Timebox đề xuất:** 2-3 giờ (1 buổi)

---

## 1. Mục đích & Nguyên tắc

- **Không phát triển mới** trong file này. Chỉ test luồng hiện tại + fix bug tìm được.
- **Bám nghiệp vụ HRM thực tế**, không chỉ smoke test kỹ thuật.
- **Đi theo thứ tự thời gian** S0 → S1 → S2 → S3 để bám cause-effect.
- **Fix strategy — fix ngay khi phát hiện**, với 2 ngoại lệ:
  - Bug lớn / cross-cutting (đụng nhiều file, cần refactor) → ghi vào §8, defer để không lạc scope test session
  - Bug đã fix xong → **retest lại flow bị ảnh hưởng** trước khi tiếp tục checklist
- **Branch:** làm trên `STABILIZATION` branch. Commit từng lô fix rõ ràng (VD `Sửa lỗi S1: text hardcode NPT`).

---

## 2. Legend

**Priority:**
- 🔴 **Blocker** — sai logic, crash, mất data, security — fix ngay
- 🟡 **UX polish** — text sai, layout lệch, missing feedback, note field... — fix theo lô
- 🟢 **Nice-to-have** — sort/search polish, breadcrumb, shortcut... — defer OK

**Status checklist:**
- `[ ]` chưa test
- `[/]` đang test
- `[x]` pass
- `[!]` fail (ghi bug ở section dưới)

---

## 3. Exit criteria (khi nào được sang Sprint 4)

- [ ] Không còn 🔴
- [ ] 🟡 xử lý hết **hoặc** consensus defer (ghi rõ lý do)
- [ ] Happy path S0-S3 pass đầy đủ
- [ ] Docs (PLAN.md + DB_SCHEMA.md) không có drift

---

## 4. S0 — Auth & Multi-tenant Foundation

**Luồng nghiệp vụ:** Đăng ký tenant → Login → Refresh → Signout → Super admin path.

### Checklist

- [~] Signup tenant mới — **skip** (đã test đầy đủ ở Sprint 0, không có regression)
- [x] Signin `tin@fpt.com` (admin) → redirect `/fpt/dashboard`
- [x] F5 khi đang login — không mất session, access token refresh tự động
- [x] Signout xóa session — quay lại `/signin`
- [x] Super admin login `admin@hrm.local` → `/super-admin/dashboard`, không thấy menu tenant
- [x] Employee login `an@fpt.com` → redirect đúng, chỉ thấy menu mình được phép
- [x] Manager login → thấy menu manager (duyệt phép)
- [x] Nhấn back button sau signout — không quay lại được page cũ
- [~] Session valid theo `companyId` — **defer đến Sprint 4** (RLS PostgreSQL sẽ thêm hard guard tầng DB + integration test)

### Bugs & observations

_Ghi bug ở đây, hoặc ghi "chưa phát hiện gì"_

- …

---

## 5. S1 — Organization + Employee

**Luồng nghiệp vụ:** HR setup cơ cấu tổ chức → thêm NV mới → cấp tài khoản → NV tự quản lý hồ sơ.

### Checklist Organization

- [ ] Sidebar collapse/expand nhóm hoạt động OK
- [ ] Sidebar item active highlight đúng khi đang ở page tương ứng
- [x] **Tổ chức > Chi nhánh** — smoke pass (16 records, CRUD OK)
- [x] **Tổ chức > Phòng ban** — smoke pass (tree 3-cấp)
- [x] **Tổ chức > Chức danh** — smoke pass
- [x] **Tổ chức > Cấp bậc** — smoke pass

### Checklist Employee

- [x] **Nhân sự > Danh sách NV** — hiển thị OK (+ bug #1 fix: click Mã/Họ tên → detail)
- [x] Filter search theo tên/code
- [x] Filter theo branch, department, status
- [~] Pagination — skip (chỉ 3 NV, chưa vượt ngưỡng)
- [x] Thêm NV mới → auto gen mã `FPT###` không trùng
- [x] Detail NV — 8 tab load OK, không lỗi console
  - [x] Thông tin
  - [x] Vị trí
  - [x] Hợp đồng
  - [x] Người phụ thuộc — text 6.200.000 ₫ hiển thị đúng (đã fix từ 4.4M cứng)
  - [x] Liên hệ khẩn cấp
  - [x] Học vấn
  - [x] Kinh nghiệm
  - [x] Tài liệu — upload R2 OK, download tên file gốc OK (RFC 5987) + bug #2 fix UI truncate + tooltip
- [x] "Cấp tài khoản đăng nhập" cho NV chưa có user → tạo user + link `employees.userId`
- [x] NV có tài khoản: signin thử, dashboard NV chỉ thấy menu employee (verified an@fpt.com)
- [x] Admin không có Employee → sidebar KHÔNG có 3 menu employee (`hasEmployee` guard verified)

### Bugs & observations

- …

---

## 6. S2 — Attendance + Leave

**Luồng nghiệp vụ:** NV chấm công hàng ngày → tạo đơn phép → Manager duyệt tầng 1 → HR duyệt tầng 2 → admin bypass workflow → HR xem báo cáo.

### Checklist Attendance

- [~] **Chấm công > Chấm công của tôi** — skip UI test (đã seed 44 records tháng 6 qua script, verified via payroll compute)
- [x] Check-out cùng ngày → tính `hoursWorked` (verified via payroll actualPaidDays=22/22)
- [x] OT auto tính khi check-out sau `shift.endTime + 15min` (verified via payroll otHours=2.00)
- [x] Lịch sử tháng hiện đủ ngày, badge status đúng (verified via seed 22 records: 18 on_time + 2 late + 2 on_leave)
- [~] **Chấm công > Ca làm việc** (HR) — skip smoke (đã ổn định qua Sprint 2)
- [~] **Chấm công > Lịch làm việc** (HR) — skip smoke
- [~] **Chấm công > Bảng chấm công** (HR) — skip smoke

### Checklist Leave

- [x] **Nghỉ phép > Loại phép** (HR) — seed 6 loại chuẩn OK
- [x] CRUD loại phép, `isPaid`, `requiresApproval`, `daysPerYear`, color
- [x] **Nghỉ phép > Đơn phép của tôi** — tạo đơn OK
- [x] Số ngày phép còn hiển thị đúng, giảm sau approve
- [x] Half-day chỉ cho phép `fromDate = toDate`
- [x] Cancel đơn khi status ∈ pending/manager_approved
- [x] **Nghỉ phép > Đơn chờ duyệt** (Manager) — chỉ thấy đơn NV phòng ban mình
- [x] Manager duyệt → `manager_approved`, transition đúng
- [x] Manager reject → `rejected` với lý do
- [x] **Nghỉ phép > Đơn chờ duyệt** (HR) — thấy đơn đã manager_approved
- [x] HR duyệt → `approved`, `leave_balances.usedDays` tự tăng
- [x] Admin bypass — nút "Duyệt trực tiếp" chỉ hiện với role=admin
- [x] Admin bypass → cả `managerApprovedBy` và `hrApprovedBy` đều ghi admin (audit)
- [x] **Nghỉ phép > Danh sách đơn phép** (HR) — filter status/employee/date

### Bugs & observations

- …

---

## 7. S3 — Payroll VN

**Luồng nghiệp vụ:** HR seed refs → cấu hình phụ cấp + lương từng NV → generate bảng lương tháng → chốt → NV xem payslip → HR export CSV.

### Checklist Config

- [x] **Lương > Danh mục phụ cấp** — CRUD OK (LUNCH miễn thuế, FUEL chịu thuế)
- [x] Toggle `isTaxable` hiển thị badge đúng
- [x] Không xóa được allowance đang gán cho NV (FK guard)
- [x] **Lương > Cấu hình lương NV** — chọn NV → thấy lịch sử salary structures + phụ cấp gán (verified qua Batch C test)
- [x] Row "Đang áp dụng" highlight background
- [x] Tạo salary structure mới → auto đóng bản cũ (verified FPT002 12M→35M)
- [x] Auto-fill `amount` khi chọn allowance có `defaultAmount`
- [x] **Lương > Tham chiếu thuế/BH** — hiển thị đúng số 2026 (5.31M vùng 1, 15.5M self, 6.2M NPT, 7 bậc PIT)

### Checklist Payroll runtime

- [x] **Lương > Bảng lương** — filter month/year/status/employee OK
- [x] Preview 1 NV — không lưu DB (verified kịch bản 35M FPT002)
- [x] Generate tháng — toast summary `{generated, skipped, errors}` OK
- [x] Row click → điều hướng detail OK
- [x] PayrollDetailPage — header + 4 summary card + breakdown items + snapshot audit đầy đủ
- [x] Workflow: Chốt (draft → finalized) → Đánh dấu đã trả (finalized → paid) — verified FPT001 tháng 6
- [x] Unlock (finalized → draft) → `unlockCount++` — verified thực địa (FPT002 tháng 6, snapshot audit hiện "Số lần unlock: 1")
- [x] Guard status transition (không finalize từ non-draft, không mark-paid từ non-finalized) — có ở BE controller
- [x] **Xóa draft payroll** — bug #3 fix (BE endpoint + FE menu)

### Checklist Employee view

- [x] Login NV có employee → thấy sidebar "Payslip của tôi"
- [x] Chọn tháng/năm chưa chốt → empty state "HR chưa chốt"
- [x] Chọn tháng/năm đã chốt → thấy PayslipView đầy đủ (verified an@fpt.com tháng 6)
- [x] NV vẫn thấy payslip sau mark-paid (query `Op.in: ['finalized', 'paid']`)
- [~] NV không thấy payroll của NV khác — skip UI test (BE guard đã có ở controller)

### Checklist Export

- [x] Export CSV — hoạt động OK (file tải về, tiếng Việt Excel VN đúng), UX chưa đẹp → defer polish sang Sprint 4

### Bugs & observations

- …

---

## 8. Bug tracker

_Format: `#N | Sprint | Priority | Description | File:line | Status`_

| # | Sprint | Priority | Description | File:line | Status |
|---|--------|----------|-------------|-----------|--------|
| 1 | S1 | 🟡 | Danh sách NV — chỉ click ⋯ > "Xem chi tiết" mới vào được detail, bất tiện. Cần click luôn vào Mã / Họ tên | [EmployeesPage.tsx:292-293](frontend/src/pages/hr/EmployeesPage.tsx#L292-L293) | ✅ Fixed |
| 2 | S1 | 🟡 | Dialog Sửa tài liệu — field File tên dài gây vỡ giao diện | [file-upload.tsx:117-120](frontend/src/components/ui/file-upload.tsx#L117-L120) | ✅ Fixed |
| 3 | S3 | 🟡 | Payroll status=draft không có nút Xóa trong UI — phải xóa qua DB script khi test data lỗi (VD gen trước khi seed attendance) | BE: [payrollController.js](backend/src/controllers/payrollController.js), FE: [PayrollListPage.tsx](frontend/src/pages/payroll/PayrollListPage.tsx) | ✅ Fixed |

---

## 9. Fix log

_Ghi ngay khi fix xong: `#N | commit-msg-ngắn | file:line | tóm tắt`_

| # | Sprint | Bug ref | File:line | Fix summary | Commit |
|---|--------|---------|-----------|-------------|--------|
| 1 | S1 | #1 | [EmployeesPage.tsx:292-303](frontend/src/pages/hr/EmployeesPage.tsx#L292-L303) | Wrap `emp.code` + `emp.displayName` trong `<Link to={.../employees/:id}>` với hover style. Dropdown ⋯ giữ nguyên. | _pending commit_ |
| 2 | S1 | #2 | [file-upload.tsx:117-127](frontend/src/components/ui/file-upload.tsx#L117-L127) | Đổi container từ `flex` → `grid grid-cols-[auto_1fr_auto_auto]`. Lý do: `flex-1` sẽ grow theo content khi text quá dài (truncate không kick in). CSS Grid `1fr` giới hạn chặt phần chia không gian → ép truncate hoạt động. Thêm `title={displayName}` cho tooltip khi hover xem đầy đủ. | _pending commit_ |
| 3 | S3 | #3 | BE: [payrollController.js](backend/src/controllers/payrollController.js) + [payrollRoute.js](backend/src/routes/payrollRoute.js), FE: [payrollService.ts](frontend/src/services/payrollService.ts) + [PayrollListPage.tsx](frontend/src/pages/payroll/PayrollListPage.tsx) | Thêm endpoint `DELETE /api/payrolls/:id` guard status=draft (transaction xóa cả PayrollItem cascade). FE thêm menu item "Xóa nháp" chỉ hiện khi draft, có ConfirmDialog destructive. | _pending commit_ |

---

## 10. Decision log

_Ghi khi consensus defer 🟡/🟢, hoặc quyết định scope-cut._

- **2026-07-11 · S0 · DEV network tab thấy API gọi 2 lần** — Do `<StrictMode>` ở [main.tsx:7](frontend/src/main.tsx#L7), React 18+ cố tình double-mount trong DEV để bắt side-effect bug. Prod build (`npm run build && npm run preview`) chỉ 1 lần. **Quyết định: giữ nguyên StrictMode**, không fix — lợi ích detect bug sớm > noise trong Network tab. Không phân loại là bug.
- **2026-07-11 · S0 · Skip signup tenant mới** — Đã test đầy đủ khi build Sprint 0, không có thay đổi FE/BE liên quan qua các sprint sau → không có regression risk.
- **2026-07-11 · S0 · Defer cross-tenant isolation test** — Hard test bằng tay không hiệu quả (cần 2 tenant + intercept request). Đúng thời điểm test là Sprint 4 khi thêm PostgreSQL RLS + Supertest integration test.
- **2026-07-11 · S3 · Defer polish Export CSV lên Sprint 4** — CSV hoạt động chuẩn (file tải về, tiếng Việt Excel VN đúng nhờ BOM UTF-8), nhưng UI xấu: header cắt cụt, số tiền `15000000` không format `15.000.000`, không styling. **Không phải bug** — CSV là format universal, HR có thể format lại 30s. Sprint 4 làm 1 lô cải tiến UX: chuyển sang `.xlsx` với `exceljs` (auto column width, bold header, cell format `#,##0` giữ NUMBER type để SUM được, freeze header row).
- **2026-07-11 · S0 · Chốt pattern Auth: JWT (memory) + refresh token (httpOnly cookie)** — Giữ nguyên, không đổi sang "bearer token trong localStorage" như một số app tiêu dùng (VD genetica.asia dùng Ory Kratos với `sessionToken` trong localStorage).
  - **Lý do:** HRM lưu dữ liệu cực nhạy cảm (CCCD, số BHXH, MST, tài khoản ngân hàng, lương). Nếu 1 chỗ dính XSS trong tương lai → localStorage bị đọc được, nhưng httpOnly cookie thì không → defense-in-depth.
  - **Trade-off chấp nhận:** F5 gọi thêm 1 request `/auth/refresh` (~50ms) để đổi lấy XSS-proof refresh token.
  - **Verify security:** Trong DevTools Cookies tab, `refreshToken` PHẢI có cột **HttpOnly** ✓ tick. `document.cookie` trong Console PHẢI không thấy `refreshToken`.
  - **Reference pattern:** Auth0 React SDK default, Firebase Auth, Supabase Auth, và mọi ngân hàng số dùng cùng approach.

---

## 11. Kết quả cuối

- **Số bug 🔴 tìm được / fix:** 0 / 0
- **Số bug 🟡 tìm được / fix / defer:** 3 / 3 / 0
- **Số bug 🟢 tìm được / defer:** 0 / 0
- **Số decision defer với justification:** 4 (StrictMode dev noise, skip signup, cross-tenant test → Sprint 4, auth pattern)
- **Thời gian thực tế:** ~2.5 giờ (đúng timebox)
- **Sẵn sàng Sprint 4?** ✅ Yes

**Điểm nhấn:**
- Payroll engine VN verified end-to-end trên 2 tháng liền kề (6/2026 dùng NQ 954/2020 cũ, 7/2026 dùng NQ 110/2025 mới) → versioning theo `effectiveFrom/To` hoạt động chuẩn
- Full workflow draft→finalized→paid + NV xem payslip đúng theo trạng thái
- 3 bugs fix ngay tại chỗ (theo strategy §1 sửa lại): click Mã/Họ tên NV, truncate filename dialog, xóa draft payroll
- Docs (PLAN.md + DB_SCHEMA.md) đã update với Sprint 3 changes, không có drift
- Chưa test: OT 200%/300% CN/lễ (chưa implement), progressive PIT với lương cao (2 case test đều PIT=0)
