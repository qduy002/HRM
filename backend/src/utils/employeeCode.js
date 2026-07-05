import { Op } from 'sequelize';
import { Company, Employee } from '../models/index.js';

// Auto gen mã NV theo format `{prefix}{NNN}`.
// Chạy trong transaction có lock trên `companies` row để chống race condition
// (2 request tạo NV cùng lúc → không sinh mã trùng).
export const generateEmployeeCode = async (companyId, transaction) => {
    const company = await Company.findOne({
        where: { id: companyId },
        transaction,
        lock: transaction.LOCK.UPDATE,
    });
    if (!company) throw new Error('Company không tồn tại');

    const prefix = company.employeeCodePrefix || 'NV';

    const employees = await Employee.findAll({
        where: {
            companyId,
            code: { [Op.like]: `${prefix}%` },
        },
        attributes: ['code'],
        transaction,
    });

    let maxNum = 0;
    for (const e of employees) {
        const numPart = e.code.slice(prefix.length);
        const n = parseInt(numPart, 10);
        if (!Number.isNaN(n) && n > maxNum) maxNum = n;
    }

    return `${prefix}${String(maxNum + 1).padStart(3, '0')}`;
};
