# CLAUDE.md — HRM

> Hướng dẫn cho Claude Code khi làm việc trên repo này. Đọc kỹ trước khi edit.

## 1. Bối cảnh dự án

HRM (Human Resource Management) — hệ thống quản lý nhân sự web **multi-tenant SaaS** (shared DB, shared schema, isolate qua `companyId`).

**Xem [PLAN.md](PLAN.md)** trước mọi task để nắm scope + sprint hiện tại + guardrails. Cập nhật PLAN.md khi có quyết định lớn.

**Schema chi tiết từng bảng + ER diagram: [DB_SCHEMA.md](DB_SCHEMA.md)**. Cập nhật khi thêm/đổi bảng.

**Stack:**
- **Backend** (`backend/`): Node + Express 5, PostgreSQL (Sequelize ORM), JWT (cookie + Bearer). Entry: [backend/src/server.js](backend/src/server.js). ESM (`"type": "module"`).
- **Frontend** (`frontend/`): React 19 + TypeScript + Vite, Tailwind v4, Radix/shadcn (new-york style), Zustand, axios, react-router 7, react-hook-form + zod, sonner.

## 2. Quy tắc giao tiếp

- **Ngôn ngữ:** Tiếng Việt là chính, giữ thuật ngữ kỹ thuật bằng tiếng Anh (state, store, migration, hook…).
- **Plan trước khi code:** Task lớn → plan ngắn 3-5 bước → chờ duyệt → edit. Bug nhỏ có thể nhảy vào code.
- **Báo cáo cuối turn:** 1-2 câu + danh sách `file:line` đã đổi.
- **Khi ambiguity:** Show 2-3 option ngắn (có thể recommend 1) → đợi user pick.

## 3. Bad habits cần tránh

- ❌ Tự tạo file `.md`, NOTES.md, TODO.md trừ khi user xin trực tiếp. (PLAN.md đã có — chỉ cập nhật, không tạo file mới.)
- ❌ Xin lỗi, khách sáo, lan man.
- ❌ Edit nhiều file cùng lúc khi task chỉ cần một — đi từng bước nhỏ.
- ❌ Over-engineer: thêm abstraction/helper/factory khi task chỉ cần inline.
- ❌ Refactor "tiện thể" khi user chỉ yêu cầu fix bug.
- ❌ Comment giải thích code (well-named identifier đủ rồi). Comment chỉ khi WHY không hiển nhiên.

## 4. Hard safety rules — DỪNG và HỎI

Tuyệt đối không tự thực hiện:

1. `git push` (kể cả force, kể cả branch riêng).
2. **Migrate schema PostgreSQL** (drop table, đổi column bắt buộc, viết migration script). Trong dev đang dùng `sequelize.sync({ alter: true })` — production cần migration riêng.
3. **Sửa `.env`, `.env.local`, secrets.**
4. **`npm install` package mới** hoặc nâng version major.

## 5. Workflow

- **Commit message:** Tiếng Việt. Format: `Tính năng: …`, `Sửa lỗi: …`, `Cải tiến: …`.
- **Verify trước khi báo xong:**
  - Frontend: `cd frontend && npx tsc -b --noEmit`.
  - Backend: ESM thuần JS, không có type-check; chạy `npm run dev` smoke nếu touch server entry.
- **Test:** Chưa có test framework. Nếu task yêu cầu thêm test → dừng và hỏi setup nào (Vitest? Jest? Supertest?).

## 6. Code conventions

### 6.1 Frontend (`frontend/src/`)

- **Cấu trúc:**
  - `pages/` — route page
  - `components/{domain}/` — component theo domain (auth, employee, department, attendance, ui…)
  - `components/ui/` — shadcn-style primitives, không sửa trừ khi update shadcn
  - `services/{domain}Service.ts` — API layer dùng `axios` ([lib/axios.ts](frontend/src/lib/axios.ts))
  - `stores/use{X}Store.ts` — Zustand store, một store cho một domain
  - `types/` — TS types chung
  - `hooks/` — custom hooks
  - `lib/` — utilities (cn, axios, format helpers…)
- **Naming:** Component PascalCase, file `.tsx`. Variable/function camelCase. Store luôn `useXStore`.
- **Form:** `react-hook-form` + `zod` schema.
- **Styling:** Tailwind utility class trực tiếp trên JSX. Variant phức tạp → `class-variance-authority`.
- **Toast:** `sonner`.
- **Icons:** `lucide-react`.
- **Alias:** `@/` → `./src/`.

### 6.2 Backend (`backend/src/`)

- **Cấu trúc:**
  - `controllers/{x}Controller.js` — controller ôm cả business logic (không tách service layer trừ khi user yêu cầu)
  - `routes/{x}Route.js` — chỉ wiring
  - `models/{X}.js` — Sequelize model. Association khai báo ngay trong model file (xem [Session.js](backend/src/models/Session.js)).
  - `models/index.js` — re-export tất cả model
  - `middlewares/` — auth, upload, role guard
  - `libs/db.js` — Sequelize instance + `connectDB()`
  - `utils/` — helper thuần
- **Error response:** `{ message: "..." }` + status code. KHÔNG đổi pattern này.
- **Validation input:** Làm thủ công trong controller — không thêm zod/joi ở BE trừ khi user yêu cầu.
- **Auth:** JWT (30m) trong Authorization header + refresh token (14 ngày) trong httpOnly cookie + Session table.
- **Role:** `admin | hr | manager | employee`. Guard bằng `requireRole('admin', 'hr')` middleware.
- **Console.log:** Tiếng Việt OK (`"Đã kết nối database"`, `"Lỗi khi cập nhật…"`).

### 6.3 Sequelize conventions

- **Password:** field `hashedPassword`, exclude khỏi default scope. Muốn lấy dùng `.scope('withPassword')`.
- **Timestamps:** để default (`createdAt`, `updatedAt`), không đổi.
- **Table name:** snake_case số nhiều (`users`, `sessions`) — set qua `tableName`.
- **Sync trong dev:** `sequelize.sync({ alter: true })` — chấp nhận trong dev, không dùng production.
- **Association:** khai báo trong file model của bảng "con" để tránh circular import (xem `Session.js`).

## 7. Vùng đau cần đặc biệt cẩn thận

Khi đụng các vùng sau, BẮT BUỘC plan + đề xuất 2-3 option trước khi code:

1. **Multi-tenant isolation** — mọi query bảng nghiệp vụ PHẢI filter `companyId`. Xem [PLAN.md §7.1](PLAN.md).
2. **Cấu trúc Zustand store** — không tự chia slice/tách store nếu user chưa yêu cầu.
3. **Schema migration** — thay đổi cột NOT NULL, đổi tên, xóa cột trên table đã có data.
4. **Auth flow** — refresh token, session invalidation, cookie sameSite, JWT payload có `companyId`.
5. **Role-based access** — thêm role mới, đổi guard logic. Roles chuẩn: `super_admin | admin | hr | manager | employee`.
6. **Payroll immutability + salary versioning** — xem [PLAN.md §7.3, §7.4](PLAN.md).

## 8. Khi không chắc

Hỏi. User là người duyệt cuối, không phải Claude.
