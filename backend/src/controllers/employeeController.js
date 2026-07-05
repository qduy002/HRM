import bcrypt from 'bcrypt';
import { Op } from 'sequelize';
import sequelize from '../libs/db.js';
import {
    Employee,
    EmployeePosition,
    Branch,
    Department,
    Position,
    Level,
    User,
    Company,
} from '../models/index.js';
import { scopeToCompany } from '../utils/tenant.js';
import { normalizeEmptyStrings, pickFields } from '../utils/normalize.js';
import {
    isUniqueViolation,
    isValidationError,
    getValidationMessage,
    getConstraintName,
} from '../utils/dbError.js';
import { generateEmployeeCode } from '../utils/employeeCode.js';

const EDITABLE_FIELDS = [
    'firstName', 'lastName',
    'gender', 'dateOfBirth', 'placeOfBirth', 'nationality', 'ethnicity', 'religion', 'maritalStatus',
    'identityNumber', 'identityIssueDate', 'identityIssuePlace', 'taxCode', 'socialInsuranceNumber',
    'phone', 'personalEmail', 'currentAddress', 'permanentAddress',
    'bankAccountNumber', 'bankAccountName', 'bankName', 'bankBranch',
    'joinedDate', 'status', 'terminatedDate', 'terminatedReason', 'avatarUrl',
];

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9]).{8,}$/;

const buildDisplayName = (lastName, firstName) => `${lastName} ${firstName}`.trim();

const mapCreateError = (error, res) => {
    if (isUniqueViolation(error)) {
        const constraint = getConstraintName(error);
        if (constraint.includes('identity')) {
            return res.status(409).json({ message: 'CCCD/CMND đã tồn tại' });
        }
        if (constraint.includes('userid')) {
            return res.status(409).json({ message: 'User đã được gán cho nhân viên khác' });
        }
        return res.status(409).json({ message: 'Mã nhân viên đã tồn tại' });
    }
    if (isValidationError(error)) {
        return res.status(400).json({ message: getValidationMessage(error) });
    }
    return null;
};

const currentPositionInclude = {
    model: EmployeePosition,
    required: false,
    where: { effectiveTo: null },
    include: [
        { model: Branch, attributes: ['id', 'code', 'name'] },
        { model: Department, attributes: ['id', 'code', 'name'] },
        { model: Position, attributes: ['id', 'code', 'name'] },
        { model: Level, attributes: ['id', 'code', 'name', 'rank'] },
    ],
};

// GET /api/employees?search=&branchId=&departmentId=&status=&page=&pageSize=
export const listEmployees = async (req, res) => {
    try {
        const {
            search,
            branchId,
            departmentId,
            status,
            page = 1,
            pageSize = 20,
        } = req.query;

        const where = { ...scopeToCompany(req) };
        if (status) where.status = status;
        if (search) {
            where[Op.or] = [
                { code: { [Op.iLike]: `%${search}%` } },
                { displayName: { [Op.iLike]: `%${search}%` } },
                { firstName: { [Op.iLike]: `%${search}%` } },
                { lastName: { [Op.iLike]: `%${search}%` } },
            ];
        }

        const positionWhere = { effectiveTo: null };
        if (branchId) positionWhere.branchId = Number(branchId);
        if (departmentId) positionWhere.departmentId = Number(departmentId);

        const limit = Math.min(Number(pageSize) || 20, 100);
        const offset = ((Number(page) || 1) - 1) * limit;

        const { rows, count } = await Employee.findAndCountAll({
            where,
            include: [
                {
                    model: EmployeePosition,
                    required: !!(branchId || departmentId),
                    where: positionWhere,
                    include: [
                        { model: Branch, attributes: ['id', 'code', 'name'] },
                        { model: Department, attributes: ['id', 'code', 'name'] },
                        { model: Position, attributes: ['id', 'code', 'name'] },
                        { model: Level, attributes: ['id', 'code', 'name', 'rank'] },
                    ],
                },
            ],
            order: [['createdAt', 'DESC']],
            limit,
            offset,
            distinct: true,
        });

        return res.status(200).json({
            employees: rows,
            pagination: { total: count, page: Number(page) || 1, pageSize: limit },
        });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách nhân viên:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

// GET /api/employees/:id
export const getEmployee = async (req, res) => {
    try {
        const employee = await Employee.findOne({
            where: { id: req.params.id, ...scopeToCompany(req) },
            include: [
                currentPositionInclude,
                {
                    model: User,
                    attributes: ['id', 'username', 'email', 'role', 'isActive'],
                },
            ],
        });
        if (!employee) return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
        return res.status(200).json({ employee });
    } catch (error) {
        console.error('Lỗi khi lấy nhân viên:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

// POST /api/employees
// Body: { firstName, lastName, branchId, departmentId, positionId, levelId?, ...các cột editable }
export const createEmployee = async (req, res) => {
    try {
        const data = normalizeEmptyStrings(pickFields(req.body, EDITABLE_FIELDS));
        const { branchId, departmentId, positionId, levelId } = req.body;

        if (!data.firstName || !data.lastName) {
            return res.status(400).json({ message: 'Thiếu firstName hoặc lastName' });
        }
        if (!branchId || !departmentId || !positionId) {
            return res.status(400).json({
                message: 'Thiếu branchId, departmentId hoặc positionId (bắt buộc khi tạo NV)',
            });
        }

        // Validate branch/dept/position/level thuộc cùng tenant
        const [branch, department, position, level] = await Promise.all([
            Branch.findOne({ where: { id: branchId, companyId: req.companyId } }),
            Department.findOne({ where: { id: departmentId, companyId: req.companyId } }),
            Position.findOne({ where: { id: positionId, companyId: req.companyId } }),
            levelId ? Level.findOne({ where: { id: levelId, companyId: req.companyId } }) : null,
        ]);
        if (!branch) return res.status(400).json({ message: 'Chi nhánh không tồn tại trong công ty' });
        if (!department) return res.status(400).json({ message: 'Phòng ban không tồn tại trong công ty' });
        if (!position) return res.status(400).json({ message: 'Chức danh không tồn tại trong công ty' });
        if (levelId && !level) return res.status(400).json({ message: 'Cấp bậc không tồn tại trong công ty' });

        const employee = await sequelize.transaction(async (t) => {
            const code = await generateEmployeeCode(req.companyId, t);
            const emp = await Employee.create(
                {
                    ...data,
                    companyId: req.companyId,
                    code,
                    displayName: buildDisplayName(data.lastName, data.firstName),
                },
                { transaction: t }
            );
            await EmployeePosition.create(
                {
                    companyId: req.companyId,
                    employeeId: emp.id,
                    branchId,
                    departmentId,
                    positionId,
                    levelId: levelId || null,
                    effectiveFrom: data.joinedDate || new Date().toISOString().split('T')[0],
                    note: 'Vị trí ban đầu',
                },
                { transaction: t }
            );
            return emp;
        });

        return res.status(201).json({ employee });
    } catch (error) {
        const mapped = mapCreateError(error, res);
        if (mapped) return mapped;
        console.error('Lỗi khi tạo nhân viên:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

// PUT /api/employees/:id
export const updateEmployee = async (req, res) => {
    try {
        const employee = await Employee.findOne({
            where: { id: req.params.id, ...scopeToCompany(req) },
        });
        if (!employee) return res.status(404).json({ message: 'Không tìm thấy nhân viên' });

        const data = normalizeEmptyStrings(pickFields(req.body, EDITABLE_FIELDS));
        if (data.firstName || data.lastName) {
            data.displayName = buildDisplayName(
                data.lastName ?? employee.lastName,
                data.firstName ?? employee.firstName
            );
        }
        await employee.update(data);
        return res.status(200).json({ employee });
    } catch (error) {
        const mapped = mapCreateError(error, res);
        if (mapped) return mapped;
        console.error('Lỗi khi cập nhật nhân viên:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

// DELETE /api/employees/:id
export const deleteEmployee = async (req, res) => {
    try {
        const employee = await Employee.findOne({
            where: { id: req.params.id, ...scopeToCompany(req) },
        });
        if (!employee) return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
        await employee.destroy();
        return res.status(204).end();
    } catch (error) {
        console.error('Lỗi khi xóa nhân viên:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

// POST /api/employees/:id/grant-account
// Body: { username, email, password, role? }
// Tạo User + link vào employees.userId. Chỉ khi employees.userId đang null.
export const grantAccount = async (req, res) => {
    try {
        const employee = await Employee.findOne({
            where: { id: req.params.id, ...scopeToCompany(req) },
        });
        if (!employee) return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
        if (employee.userId) {
            return res.status(400).json({ message: 'Nhân viên này đã có tài khoản đăng nhập' });
        }

        const { username, email, password, role = 'employee' } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Thiếu username, email hoặc password' });
        }
        if (!PASSWORD_REGEX.test(password)) {
            return res.status(400).json({
                message: 'Mật khẩu phải có ít nhất 8 ký tự, 1 chữ hoa, 1 số và 1 ký tự đặc biệt',
            });
        }
        if (!['admin', 'hr', 'manager', 'employee'].includes(role)) {
            return res.status(400).json({ message: 'Role không hợp lệ' });
        }

        const emailNorm = email.toLowerCase().trim();
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await sequelize.transaction(async (t) => {
            const created = await User.create(
                {
                    companyId: req.companyId,
                    username,
                    email: emailNorm,
                    hashedPassword,
                    firstName: employee.firstName,
                    lastName: employee.lastName,
                    displayName: employee.displayName,
                    role,
                },
                { transaction: t }
            );
            employee.userId = created.id;
            await employee.save({ transaction: t });
            return created;
        });

        return res.status(201).json({
            message: 'Cấp tài khoản thành công',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        if (isUniqueViolation(error)) {
            return res.status(409).json({ message: 'Username hoặc email đã tồn tại' });
        }
        console.error('Lỗi khi cấp tài khoản:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

// POST /api/employees/:id/change-position
// Body: { branchId, departmentId, positionId, levelId?, effectiveFrom, note? }
// Đóng vị trí hiện tại (effectiveTo) + tạo vị trí mới.
export const changePosition = async (req, res) => {
    try {
        const employee = await Employee.findOne({
            where: { id: req.params.id, ...scopeToCompany(req) },
        });
        if (!employee) return res.status(404).json({ message: 'Không tìm thấy nhân viên' });

        const { branchId, departmentId, positionId, levelId, effectiveFrom, note } = req.body;
        if (!branchId || !departmentId || !positionId || !effectiveFrom) {
            return res.status(400).json({
                message: 'Thiếu branchId, departmentId, positionId hoặc effectiveFrom',
            });
        }

        const [branch, department, position, level] = await Promise.all([
            Branch.findOne({ where: { id: branchId, companyId: req.companyId } }),
            Department.findOne({ where: { id: departmentId, companyId: req.companyId } }),
            Position.findOne({ where: { id: positionId, companyId: req.companyId } }),
            levelId ? Level.findOne({ where: { id: levelId, companyId: req.companyId } }) : null,
        ]);
        if (!branch || !department || !position || (levelId && !level)) {
            return res.status(400).json({ message: 'Tham chiếu không hợp lệ hoặc không cùng tenant' });
        }

        const newPos = await sequelize.transaction(async (t) => {
            const previousDate = new Date(effectiveFrom);
            previousDate.setDate(previousDate.getDate() - 1);
            const previousEndStr = previousDate.toISOString().split('T')[0];

            await EmployeePosition.update(
                { effectiveTo: previousEndStr },
                {
                    where: {
                        employeeId: employee.id,
                        companyId: req.companyId,
                        effectiveTo: null,
                    },
                    transaction: t,
                }
            );

            return EmployeePosition.create(
                {
                    companyId: req.companyId,
                    employeeId: employee.id,
                    branchId,
                    departmentId,
                    positionId,
                    levelId: levelId || null,
                    effectiveFrom,
                    note: note || null,
                },
                { transaction: t }
            );
        });

        return res.status(201).json({ position: newPos });
    } catch (error) {
        console.error('Lỗi khi đổi vị trí:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

// GET /api/employees/:id/positions
// Trả lịch sử vị trí (tất cả), mới nhất trước.
export const listPositionHistory = async (req, res) => {
    try {
        const employee = await Employee.findOne({
            where: { id: req.params.id, ...scopeToCompany(req) },
        });
        if (!employee) return res.status(404).json({ message: 'Không tìm thấy nhân viên' });

        const positions = await EmployeePosition.findAll({
            where: { employeeId: employee.id, companyId: req.companyId },
            include: [
                { model: Branch, attributes: ['id', 'code', 'name'] },
                { model: Department, attributes: ['id', 'code', 'name'] },
                { model: Position, attributes: ['id', 'code', 'name'] },
                { model: Level, attributes: ['id', 'code', 'name', 'rank'] },
            ],
            order: [['effectiveFrom', 'DESC']],
        });
        return res.status(200).json({ positions });
    } catch (error) {
        console.error('Lỗi khi lấy lịch sử vị trí:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};
