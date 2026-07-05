// Helper trả về base `where` để scope query theo tenant hiện tại.
// Dùng như: Model.findAll({ where: { ...scopeToCompany(req), status: 'active' } })
// Chỉ dùng SAU tenantMiddleware — nếu req.companyId thiếu, throw để tránh data leak.
export const scopeToCompany = (req) => {
    if (!req.companyId) {
        throw new Error(
            'scopeToCompany yêu cầu request đã đi qua tenantMiddleware. ' +
            'Nếu đây là super_admin route, không được dùng helper này.'
        );
    }
    return { companyId: req.companyId };
};
