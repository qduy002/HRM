import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const r2 = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

const BUCKET = process.env.R2_BUCKET_NAME;

// Upload buffer lên R2. Trả về key đã lưu.
export const uploadObject = async (key, buffer, contentType) => {
    await r2.send(
        new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            Body: buffer,
            ContentType: contentType,
        })
    );
    return key;
};

// Tạo presigned URL để download file — TTL mặc định 1 giờ.
// Nếu truyền `filename`, R2 sẽ set Content-Disposition → browser tải với tên đó
// thay vì tên key gốc có prefix timestamp-hash. Hỗ trợ Unicode qua RFC 5987.
export const getPresignedDownloadUrl = async (key, { expiresIn = 3600, filename, forceDownload = false } = {}) => {
    const params = { Bucket: BUCKET, Key: key };
    if (filename) {
        const disposition = forceDownload ? 'attachment' : 'inline';
        const asciiSafe = filename.replace(/[^\x20-\x7E]/g, '_');
        params.ResponseContentDisposition =
            `${disposition}; filename="${asciiSafe}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
    }
    const command = new GetObjectCommand(params);
    return getSignedUrl(r2, command, { expiresIn });
};

// Xóa object trên R2 (dùng khi user xóa document/contract).
export const deleteObject = async (key) => {
    await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
};

export default r2;
