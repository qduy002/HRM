import { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, X, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadService, type UploadModule } from "@/services/uploadService";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  value?: string;
  onChange: (value: string, meta?: { originalName: string; size: number; mimeType: string }) => void;
  module: UploadModule;
  employeeId?: number;
  accept?: string;
  className?: string;
  disabled?: boolean;
}

const ACCEPT_DEFAULT = ".pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.xls,.xlsx";

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const filenameFromKey = (key: string) => {
  const last = key.split("/").pop() || key;
  // Định dạng "timestamp-hash-originalname.ext" → strip prefix
  const m = last.match(/^\d+-[a-f0-9]+-(.+)$/);
  return m ? m[1] : last;
};

export const FileUpload = ({
  value,
  onChange,
  module,
  employeeId,
  accept = ACCEPT_DEFAULT,
  className,
  disabled,
}: FileUploadProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [meta, setMeta] = useState<{ name: string; size: number } | null>(null);

  const handlePick = () => inputRef.current?.click();

  const handleFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File tối đa 10 MB");
      return;
    }
    try {
      setUploading(true);
      const result = await uploadService.upload(file, module, employeeId);
      onChange(result.key, {
        originalName: result.originalName,
        size: result.size,
        mimeType: result.mimeType,
      });
      setMeta({ name: result.originalName, size: result.size });
      toast.success("Upload thành công");
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Upload thất bại");
    } finally {
      setUploading(false);
    }
  };

  const handleClear = () => {
    onChange("", undefined);
    setMeta(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const isHttpUrl = value?.startsWith("http://") || value?.startsWith("https://");
  const hasFile = !!value;
  const displayName = meta?.name || (value ? filenameFromKey(value) : "");

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
        disabled={disabled || uploading}
      />

      {!hasFile ? (
        <Button
          type="button"
          variant="outline"
          onClick={handlePick}
          disabled={disabled || uploading}
          className="w-full"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang upload...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Chọn file (PDF, ảnh, DOC, XLS...)
            </>
          )}
        </Button>
      ) : (
        <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 rounded-md border p-2 bg-muted/30 w-full">
          <FileText className="h-4 w-4 text-primary" />
          <div className="min-w-0 overflow-hidden">
            <p
              className="text-sm font-medium overflow-hidden text-ellipsis whitespace-nowrap"
              title={displayName}
            >
              {displayName}
            </p>
            <p className="text-xs text-muted-foreground">
              {meta?.size ? formatSize(meta.size) : ""}
              {isHttpUrl && (
                <span className="text-amber-600"> · Link ngoài (không upload qua R2)</span>
              )}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handlePick}
            disabled={disabled || uploading}
            title="Chọn file khác"
          >
            <Upload className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClear}
            disabled={disabled || uploading}
            title="Xóa file"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
