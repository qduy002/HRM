import { WorkSchedule, Employee, Shift } from '../models/index.js';
import { scopeToCompany } from '../utils/tenant.js';
import { normalizeEmptyStrings, pickFields } from '../utils/normalize.js';
import { isValidationError, getValidationMessage } from '../utils/dbError.js';

const EDITABLE_FIELDS = ['employeeId', 'shiftId', 'effectiveFrom', 'effectiveTo', 'note'];

const mapError = (error, res) => {
    if (isValidationError(error)) {
        return res.status(400).json({ message: getValidationMessage(error) });
    }
    return null;
};

export const listWorkSchedules = async (req, res) => {
    try {
        const { employeeId } = req.query;
        const where = { ...scopeToCompany(req) };
        if (employeeId) where.employeeId = Number(employeeId);

        const items = await WorkSchedule.findAll({
            where,
            include: [
                { model: Employee, attributes: ['id', 'code', 'displayName'] },
                { model: Shift, attributes: ['id', 'code', 'name', 'startTime', 'endTime'] },
            ],
            order: [['effectiveFrom', 'DESC']],
        });
        return res.status(200).json({ workSchedules: items });
    } catch (error) {
        console.error('Lỗi lấy work_schedules:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

export const createWorkSchedule = async (req, res) => {
    try {
        const data = normalizeEmptyStrings(pickFields(req.body, EDITABLE_FIELDS));
        if (!data.employeeId || !data.shiftId || !data.effectiveFrom) {
            return res.status(400).json({ message: 'Thiếu employeeId, shiftId hoặc effectiveFrom' });
        }

        // Validate cùng tenant
        const [emp, shift] = await Promise.all([
            Employee.findOne({ where: { id: data.employeeId, companyId: req.companyId } }),
            Shift.findOne({ where: { id: data.shiftId, companyId: req.companyId } }),
        ]);
        if (!emp) return res.status(400).json({ message: 'Nhân viên không tồn tại trong công ty' });
        if (!shift) return res.status(400).json({ message: 'Ca không tồn tại trong công ty' });

        const schedule = await WorkSchedule.create({ ...data, companyId: req.companyId });
        return res.status(201).json({ workSchedule: schedule });
    } catch (error) {
        const mapped = mapError(error, res);
        if (mapped) return mapped;
        console.error('Lỗi tạo work_schedule:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

export const updateWorkSchedule = async (req, res) => {
    try {
        const item = await WorkSchedule.findOne({
            where: { id: req.params.id, ...scopeToCompany(req) },
        });
        if (!item) return res.status(404).json({ message: 'Không tìm thấy lịch làm' });

        const data = normalizeEmptyStrings(pickFields(req.body, EDITABLE_FIELDS));
        await item.update(data);
        return res.status(200).json({ workSchedule: item });
    } catch (error) {
        const mapped = mapError(error, res);
        if (mapped) return mapped;
        console.error('Lỗi cập nhật work_schedule:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

export const deleteWorkSchedule = async (req, res) => {
    try {
        const item = await WorkSchedule.findOne({
            where: { id: req.params.id, ...scopeToCompany(req) },
        });
        if (!item) return res.status(404).json({ message: 'Không tìm thấy lịch làm' });
        await item.destroy();
        return res.status(204).end();
    } catch (error) {
        console.error('Lỗi xóa work_schedule:', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};
