import { Company, User } from '../models/index.js';
import { scopeToCompany } from '../utils/tenant.js';

// GET /api/users/me
// Trả thông tin user hiện tại + company (null nếu super_admin).
export const getMe = async (req, res) => {
    try {
        let company = null;
        if (req.user.companyId) {
            company = await Company.findByPk(req.user.companyId);
        }
        return res.status(200).json({ user: req.user, company });
    } catch (error) {
        console.error('Lỗi khi lấy thông tin người dùng: ', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

// GET /api/users
// Chỉ trả user trong cùng tenant. Yêu cầu tenantMiddleware + role admin/hr.
export const getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            where: scopeToCompany(req),
            order: [['createdAt', 'DESC']],
        });
        return res.status(200).json({ users });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách người dùng: ', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};
