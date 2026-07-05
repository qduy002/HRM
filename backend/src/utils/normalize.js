// Chuyển các giá trị chuỗi rỗng "" thành null — tránh Sequelize validate (isEmail…) fail trên "".
export const normalizeEmptyStrings = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    const result = {};
    for (const [k, v] of Object.entries(obj)) {
        result[k] = typeof v === 'string' && v.trim() === '' ? null : v;
    }
    return result;
};

// Trả payload chỉ chứa các field cho phép — chống mass-assignment (VD: user không được set companyId).
export const pickFields = (obj, allowed) => {
    if (!obj || typeof obj !== 'object') return {};
    const result = {};
    for (const key of allowed) {
        if (key in obj) result[key] = obj[key];
    }
    return result;
};
