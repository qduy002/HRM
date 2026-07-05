// Helper phân loại lỗi DB từ Sequelize/pg.
// Sequelize không luôn wrap lỗi FK/unique với đúng subclass — check thêm error code (Postgres 23xxx).

// Postgres codes: 23503 = foreign_key_violation (INSERT/UPDATE), 23001 = restrict_violation (DELETE với RESTRICT).
export const isForeignKeyViolation = (error) => {
    if (error.name === 'SequelizeForeignKeyConstraintError') return true;
    const code = error.parent?.code || error.original?.code;
    return code === '23503' || code === '23001';
};

export const isUniqueViolation = (error) =>
    error.name === 'SequelizeUniqueConstraintError' ||
    error.parent?.code === '23505' ||
    error.original?.code === '23505';

export const isValidationError = (error) =>
    error.name === 'SequelizeValidationError';

// Lấy tên constraint từ Postgres error — dùng để phân biệt lỗi unique nào bị vi phạm
// khi model có nhiều composite unique index.
export const getConstraintName = (error) =>
    error.parent?.constraint || error.original?.constraint || '';

export const getValidationMessage = (error) =>
    error.errors?.[0]?.message ?? 'Dữ liệu không hợp lệ';
