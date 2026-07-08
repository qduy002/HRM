# File Upload — R2 + Presigned URL

> Tài liệu kỹ thuật giải thích cách HRM xử lý upload/download file (contracts, documents, avatars) với Cloudflare R2. Note lại từ discussion Sprint 1.6.

---

## 1. Vì sao chọn kiến trúc này?

### Requirements
- File nhạy cảm (CCCD scan, HĐ lương chi tiết) — **không được public**
- Chỉ user authenticated + đúng tenant mới xem được
- Cần cost-effective — R2 zero egress fee
- Muốn tên file khi tải xuống có ý nghĩa (VD `HD-HD001-2026.pdf` chứ không phải `1783521786410-4d7e2240-scan.pdf`)

### 3 pattern phổ biến

| Pattern | Ưu | Nhược | HRM chọn? |
|---|---|---|---|
| **Public bucket** (Cloudflare R2 public) | Đơn giản, không cần BE proxy download | Ai có link đều xem được — nguy hiểm cho HRM | ❌ |
| **Private + BE proxy** (BE stream file cho client) | An toàn nhất | Tốn bandwidth BE, không scale tốt cho file lớn | ❌ |
| **Private + Presigned URL** ⭐ | An toàn + BE nhẹ (chỉ trả URL) | Cần thiết kế URL logic đúng | ✅ |

**HRM dùng Private + Presigned URL** — S3/R2 hỗ trợ sẵn, đây là industry standard.

---

## 2. Flow tổng quan

### Upload
```
[FE FileUpload component]
      │
      │ 1. User pick file
      ▼
[POST /api/uploads multipart]
   file, module, employeeId
      │
      ▼
[BE middlewares/uploadMiddleware.js]
   Multer parse multipart
   - Check size ≤ 10 MB
   - Whitelist mime type (PDF, ảnh, DOC, XLS)
      │
      ▼
[BE controllers/uploadController.js]
   Gen key: uploads/{companyId}/employees/{employeeId}/{module}/{timestamp}-{hash}-{sanitizedFilename}
      │
      ▼
[BE libs/r2.js → S3Client]
   PUT object lên R2 bucket private
      │
      ▼
[FE nhận key R2]
   Lưu key vào DB (contracts.fileUrl / employee_documents.fileUrl)
```

### Download
```
[FE user click "Mở file"]
      │
      │ 1. Tính filename thân thiện
      │    (VD: "HD-HD001-2026.pdf")
      ▼
[GET /api/uploads/presigned?key=X&filename=Y]
      │
      ▼
[BE tenant isolation check]
   key.startsWith(`uploads/${companyId}/`) → 403 nếu sai
      │
      ▼
[BE libs/r2.js → getSignedUrl()]
   Tạo GetObjectCommand với ResponseContentDisposition
   Sign URL với TTL 1 giờ
      │
      ▼
[FE nhận presigned URL, window.open()]
      │
      ▼
[Browser GET URL trực tiếp từ R2]
   R2 kiểm tra signature còn hạn
   R2 set Content-Disposition header từ ResponseContentDisposition param
   Trả file với tên đẹp
```

---

## 3. R2 Key Structure

Path convention:
```
uploads/{companyId}/employees/{employeeId}/{module}/{timestamp}-{hash}-{filename}
uploads/{companyId}/{module}/{timestamp}-{hash}-{filename}  (không thuộc employee)
```

Ví dụ:
```
uploads/1/employees/1/documents/1783521786410-4d7e2240-Xac_nhan_dich_vu.docx
uploads/1/employees/1/contracts/1783523293655-320475e9-hd-scan.pdf
```

### Vì sao có prefix `{timestamp}-{hash}-`?

| Lý do | Giải thích |
|---|---|
| **Chống collision** | 2 user cùng upload `CV.pdf` không đè lên nhau |
| **Bảo mật** | Random hash ngăn attacker đoán key file khác |
| **Immutability** | Mỗi upload là 1 file mới, có audit trail |
| **Cache-friendly** | CDN có thể cache mãi vì key duy nhất |
| **Industry standard** | AWS, Slack, Discord, GitHub đều làm vậy |

Xem code: [backend/src/controllers/uploadController.js](../backend/src/controllers/uploadController.js) — hàm `uploadFile`.

---

## 4. Filename khi Download — Content-Disposition

### Vấn đề

Nếu không xử lý, browser tải xuống với tên = key R2 → xấu:
`1783521786410-4d7e2240-Xac_nhan_dich_vu.docx`

### Giải pháp: **`Content-Disposition` HTTP header**

Server có thể override tên file browser dùng khi download:

```
Content-Disposition: inline; filename="AAAAA.docx"; filename*=UTF-8''AAAAA.docx
```

Browser ưu tiên `filename*=` nếu hỗ trợ UTF-8 (mọi browser modern).

**Ai support cho HRM?**

Cloudflare R2 (giống AWS S3) cho phép set header này qua **query param của presigned URL**:

```js
// backend/src/libs/r2.js
new GetObjectCommand({
  Bucket: 'hrm-uploads',
  Key: 'uploads/1/.../timestamp-hash-scan.pdf',
  ResponseContentDisposition: `inline; filename="HD-001.pdf"; filename*=UTF-8''HD-001.pdf`,
});
```

R2 nhận `ResponseContentDisposition` → set header đúng khi serve file → browser dùng tên đẹp.

### RFC 5987 — Encoding tiếng Việt

Tên file `Hợp đồng Nguyễn Văn A.pdf` chứa ký tự non-ASCII. HTTP header cũ (RFC 2616) chỉ chấp nhận ASCII. Cần **RFC 5987**:

```
filename="Hop dong Nguy_n V_n A.pdf"                   ← ASCII fallback
filename*=UTF-8''Hop%20dong%20Nguy%E1%BB%85n%20V%C4%83n%20A.pdf  ← UTF-8 encoded
```

- `filename="..."` — fallback cho browser cũ, replace non-ASCII bằng underscore
- `filename*=UTF-8''<url-encoded>` — theo RFC 5987, browser modern dùng cái này

Code implement:
```js
// backend/src/libs/r2.js
const asciiSafe = filename.replace(/[^\x20-\x7E]/g, '_');
params.ResponseContentDisposition =
    `${disposition}; filename="${asciiSafe}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
```

### `inline` vs `attachment`

- `inline` — browser mở tab hiển thị nếu type support (PDF, ảnh, TXT)
- `attachment` — force download về Downloads/, không mở

FE có thể chọn qua query `?download=1`.

---

## 5. Logic tính filename ở FE

### Tab **Documents** (Tài liệu)

```ts
// frontend/src/components/employee/DocumentsTab.tsx
const hasExt = /\.[a-z0-9]{2,5}$/i.test(doc.name);
const extMatch = doc.fileUrl.match(/\.([a-z0-9]{2,5})$/i);
const ext = extMatch ? extMatch[1] : "";
const filename = hasExt || !ext ? doc.name : `${doc.name}.${ext}`;
await openFileByReference(doc.fileUrl, { filename });
```

**Ví dụ:**

| doc.name | doc.fileUrl (key) | Tên tải xuống |
|---|---|---|
| `AAAAA` | `uploads/1/.../Xac_nhan.docx` | **`AAAAA.docx`** |
| `CV.pdf` | `uploads/1/.../my-cv.pdf` | **`CV.pdf`** |
| `Ảnh CCCD` | `uploads/1/.../cccd.jpg` | **`Ảnh CCCD.jpg`** |

**Vì sao parse ext từ R2 key chứ không từ MIME type?**
- Word docx có MIME `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Excel xlsx tương tự dài
- Parse từ MIME sẽ ra tên xấu: `AAAAA.vnd.openxml...document`
- Key R2 luôn giữ ext gốc từ upload → chuẩn nhất

### Tab **Contracts** (Hợp đồng)

```ts
// frontend/src/components/employee/ContractsTab.tsx
const extMatch = contract.fileUrl.match(/\.([a-z0-9]{2,5})$/i);
const ext = extMatch ? extMatch[1] : "pdf";
const safeName = contract.code.replace(/[/\\]/g, "-");
const filename = `HD-${safeName}.${ext}`;
await openFileByReference(contract.fileUrl, { filename });
```

**Ví dụ:**

| contract.code | Tên tải xuống |
|---|---|
| `HD001/2026` | **`HD-HD001-2026.pdf`** |
| `HD002/2026` (docx scan) | **`HD-HD002-2026.docx`** |

**Vì sao khác Document?**
- Contract không có field `name`, dùng `code` làm identifier
- Thêm prefix `HD-` phân biệt với file khác trên máy user
- Replace `/` `\` bằng `-` vì OS không cho phép trong tên file

---

## 6. Security — Tenant Isolation

```js
// backend/src/controllers/uploadController.js
const tenantPrefix = `uploads/${req.companyId}/`;
if (!String(key).startsWith(tenantPrefix)) {
    return res.status(403).json({ message: 'Key không thuộc tenant này' });
}
```

- User của tenant A cố lấy file của tenant B → 403 ở BE, không thể tạo presigned URL
- Cả 3 endpoint (`presigned`, `delete`, `upload`) đều check tenant

**Attack pattern chống được:**
- Attacker copy key từ HTTP response của mình → đoán key tenant khác dạng `uploads/2/employees/1/documents/...` → BE reject

**Presigned URL TTL 1 giờ:**
- Nếu URL leak (VD user paste vào chat) → sau 1h vô hiệu
- Muốn xem lại phải gọi endpoint tạo URL mới

---

## 7. Tham khảo

### Chuẩn HTTP / RFC
- [RFC 6266 — Content-Disposition Header](https://datatracker.ietf.org/doc/html/rfc6266)
- [RFC 5987 — Character Set and Language Encoding](https://datatracker.ietf.org/doc/html/rfc5987)
- [MDN — Content-Disposition](https://developer.mozilla.org/docs/Web/HTTP/Headers/Content-Disposition)

### AWS S3 / Cloudflare R2 docs
- [AWS SDK v3 — GetObjectCommand ResponseContentDisposition](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/command/GetObjectCommand/)
- [Cloudflare R2 — S3 API compatibility](https://developers.cloudflare.com/r2/api/s3/api/)
- [S3 Presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/ShareObjectPreSignedURL.html)

### Code liên quan trong HRM
- [backend/src/libs/r2.js](../backend/src/libs/r2.js) — S3Client + upload/presign/delete helpers
- [backend/src/controllers/uploadController.js](../backend/src/controllers/uploadController.js) — endpoint logic + isolation
- [backend/src/middlewares/uploadMiddleware.js](../backend/src/middlewares/uploadMiddleware.js) — multer config
- [frontend/src/services/uploadService.ts](../frontend/src/services/uploadService.ts) — upload/download/delete API + `openFileByReference` helper
- [frontend/src/components/ui/file-upload.tsx](../frontend/src/components/ui/file-upload.tsx) — reusable file picker
- [frontend/src/components/employee/DocumentsTab.tsx](../frontend/src/components/employee/DocumentsTab.tsx) — logic tính filename cho documents
- [frontend/src/components/employee/ContractsTab.tsx](../frontend/src/components/employee/ContractsTab.tsx) — logic tính filename cho contracts

---

## 8. Test bằng curl

```bash
# Login lấy token
TOKEN=$(curl -sS -X POST http://localhost:5001/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"tin@fpt.com","password":"Admin@123"}' \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).accessToken))")

# Upload file
UPLOAD=$(curl -sS -X POST http://localhost:5001/api/uploads \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@./test.pdf" \
  -F "module=documents" \
  -F "employeeId=1")

# Trích key
KEY=$(echo "$UPLOAD" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).key))")

# Lấy presigned URL với filename tùy chỉnh
curl -sS "http://localhost:5001/api/uploads/presigned?key=$KEY&filename=CV_Nguyen_Van_A.pdf" \
  -H "Authorization: Bearer $TOKEN"

# Force download (attachment thay vì inline)
curl -sS "http://localhost:5001/api/uploads/presigned?key=$KEY&filename=x.pdf&download=1" \
  -H "Authorization: Bearer $TOKEN"

# Xóa
curl -sS -X DELETE "http://localhost:5001/api/uploads?key=$KEY" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 9. Limitations & Future Improvements

**Hiện tại:**
- File tối đa 10 MB (config trong middleware)
- Chỉ whitelist mime type: PDF, ảnh (JPG/PNG/WEBP/GIF), DOC/DOCX, XLS/XLSX
- Khi sửa document/contract để thay file khác → **file cũ trên R2 không tự dọn** (chỉ khi delete record). Best-effort dọn khi delete.
- Storage key stored trong `fileUrl` field — semantic hơi lẫn (URL vs key). Có thể migrate sang `fileKey` sau.

**Ý tưởng nâng cấp:**
- **Multipart upload** cho file > 5 MB (dùng `@aws-sdk/lib-storage`)
- **Virus scan** trước khi lưu key vào DB (dùng ClamAV hoặc VirusTotal)
- **Image transform** (resize avatar) — Cloudflare Images hoặc Sharp trên BE
- **CORS + direct upload** — FE upload thẳng R2 với presigned PUT, không qua BE (tiết kiệm bandwidth BE)
- **Cleanup cron job** — quét R2 vs DB, xóa key mồ côi
