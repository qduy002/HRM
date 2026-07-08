import api from "@/lib/axios";

export interface UploadResult {
  key: string;
  size: number;
  mimeType: string;
  originalName: string;
}

export type UploadModule = "documents" | "contracts" | "avatars" | "general";

export const uploadService = {
  upload: async (file: File, module: UploadModule, employeeId?: number): Promise<UploadResult> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("module", module);
    if (employeeId) formData.append("employeeId", String(employeeId));

    const res = await api.post("/uploads", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  getDownloadUrl: async (
    key: string,
    opts?: { filename?: string; download?: boolean }
  ): Promise<string> => {
    const res = await api.get("/uploads/presigned", {
      params: {
        key,
        ...(opts?.filename && { filename: opts.filename }),
        ...(opts?.download && { download: 1 }),
      },
    });
    return res.data.url;
  },

  delete: async (key: string): Promise<void> => {
    await api.delete("/uploads", { params: { key } });
  },
};

// Helper: mở file trong tab mới. Nếu là URL http (legacy paste) → mở trực tiếp.
// Nếu là R2 key → gọi BE lấy presigned URL rồi mở.
// `filename` (optional) — tên hiển thị cho user khi tải xuống.
export const openFileByReference = async (
  ref: string,
  opts?: { filename?: string; download?: boolean }
): Promise<void> => {
  if (ref.startsWith("http://") || ref.startsWith("https://")) {
    window.open(ref, "_blank", "noopener");
    return;
  }
  const url = await uploadService.getDownloadUrl(ref, opts);
  window.open(url, "_blank", "noopener");
};
