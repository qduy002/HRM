// Đảm bảo request đến từ 1 tenant user (admin/hr/manager/employee).
// Chặn super_admin — super_admin dùng route riêng.
// Gán req.companyId để controllers dùng.
export const tenantMiddleware = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Chưa xác thực' });
    }
    if (req.user.role === 'super_admin') {
        return res.status(403).json({
            message: 'Endpoint này chỉ dành cho tenant user. Super admin dùng /api/super-admin',
        });
    }
    if (!req.user.companyId) {
        return res.status(500).json({ message: 'User thiếu companyId — dữ liệu bất thường' });
    }
    req.companyId = req.user.companyId;
    next();
};

// Chỉ cho phép super_admin.
export const superAdminOnly = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Chưa xác thực' });
    }
    if (req.user.role !== 'super_admin') {
        return res.status(403).json({ message: 'Chỉ super_admin được phép' });
    }
    next();
};
