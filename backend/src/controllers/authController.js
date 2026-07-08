import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import sequelize from '../libs/db.js';
import { Company, User, Session } from '../models/index.js';
import { seedDefaultLeaveTypes } from '../utils/leave.js';

const ACCESS_TOKEN_TTL = '30m';
const REFRESH_TOKEN_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const TRIAL_DAYS = 14;
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9]).{8,}$/;

const signAccessToken = (user, company) =>
    jwt.sign(
        {
            userId: user.id,
            role: user.role,
            companyId: user.companyId,
            companyCode: company?.code || null,
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: ACCESS_TOKEN_TTL }
    );

const issueSession = async (userId) => {
    const refreshToken = crypto.randomBytes(64).toString('hex');
    await Session.create({
        userId,
        refreshToken,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    });
    return refreshToken;
};

const setRefreshCookie = (res, refreshToken) => {
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: REFRESH_TOKEN_TTL_MS,
    });
};

// POST /api/auth/signup-tenant (public)
// Tạo tenant mới + admin user, auto-login, trial 14 ngày.
export const signupTenant = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const {
            companyName,
            companyCode,
            taxCode,
            employeeCodePrefix,
            firstName,
            lastName,
            username,
            email,
            password,
        } = req.body;

        if (!companyName || !companyCode || !firstName || !lastName || !username || !email || !password) {
            await t.rollback();
            return res.status(400).json({
                message: 'Thiếu companyName, companyCode, firstName, lastName, username, email hoặc password',
            });
        }

        if (!PASSWORD_REGEX.test(password)) {
            await t.rollback();
            return res.status(400).json({
                message: 'Mật khẩu phải có ít nhất 8 ký tự, 1 chữ hoa, 1 số và 1 ký tự đặc biệt',
            });
        }

        const emailNorm = email.toLowerCase().trim();
        const codeNorm = companyCode.toLowerCase().trim();

        const dupCompany = await Company.findOne({ where: { code: codeNorm }, transaction: t });
        if (dupCompany) {
            await t.rollback();
            return res.status(409).json({ message: 'Mã công ty đã tồn tại' });
        }

        const dupUser = await User.findOne({ where: { email: emailNorm }, transaction: t });
        if (dupUser) {
            await t.rollback();
            return res.status(409).json({ message: 'Email đã được sử dụng' });
        }

        const company = await Company.create(
            {
                code: codeNorm,
                name: companyName,
                taxCode: taxCode || null,
                employeeCodePrefix: employeeCodePrefix || null,
                status: 'trial',
                trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
            },
            { transaction: t }
        );

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create(
            {
                companyId: company.id,
                username,
                hashedPassword,
                email: emailNorm,
                firstName,
                lastName,
                displayName: `${lastName} ${firstName}`,
                role: 'admin',
            },
            { transaction: t }
        );

        // Auto seed 6 loại phép chuẩn VN
        await seedDefaultLeaveTypes(company.id, t);

        await t.commit();

        const accessToken = signAccessToken(user, company);
        const refreshToken = await issueSession(user.id);
        setRefreshCookie(res, refreshToken);

        return res.status(201).json({
            message: 'Đăng ký tenant thành công',
            accessToken,
        });
    } catch (error) {
        await t.rollback();
        console.error('Lỗi khi đăng ký tenant: ', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

// POST /api/auth/signin (public)
// Dùng email + password. Trả JWT có companyId + role + companyCode.
export const signIn = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Thiếu email hoặc password' });
        }

        const emailNorm = email.toLowerCase().trim();

        const foundUser = await User.scope('withPassword').findOne({
            where: { email: emailNorm },
            include: [{ model: Company }],
        });

        if (!foundUser) {
            return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
        }

        if (!foundUser.isActive) {
            return res.status(403).json({ message: 'Tài khoản đã bị vô hiệu hóa' });
        }

        const passwordCorrect = await bcrypt.compare(password, foundUser.hashedPassword);
        if (!passwordCorrect) {
            return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
        }

        // Tenant user: check company status
        if (foundUser.role !== 'super_admin') {
            const company = foundUser.Company;
            if (!company) {
                return res.status(500).json({ message: 'User thiếu company — dữ liệu bất thường' });
            }
            if (company.status === 'suspended') {
                return res.status(403).json({ message: 'Công ty đã bị tạm khóa' });
            }
        }

        const accessToken = signAccessToken(foundUser, foundUser.Company);
        const refreshToken = await issueSession(foundUser.id);
        setRefreshCookie(res, refreshToken);

        return res.status(200).json({
            message: 'Đăng nhập thành công',
            accessToken,
        });
    } catch (error) {
        console.error('Lỗi khi đăng nhập: ', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

// POST /api/auth/signout
export const signOut = async (req, res) => {
    try {
        const token = req.cookies?.refreshToken;
        if (token) {
            await Session.destroy({ where: { refreshToken: token } });
            res.clearCookie('refreshToken');
        }
        return res.status(200).json({ message: 'Đăng xuất thành công' });
    } catch (error) {
        console.error('Lỗi khi đăng xuất: ', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};

// POST /api/auth/refresh
export const refreshToken = async (req, res) => {
    try {
        const token = req.cookies?.refreshToken;
        if (!token) {
            return res.status(401).json({ message: 'Không tìm thấy refresh token' });
        }

        const session = await Session.findOne({ where: { refreshToken: token } });
        if (!session) {
            return res.status(403).json({ message: 'Refresh token không hợp lệ' });
        }
        if (session.expiresAt < new Date()) {
            await session.destroy();
            return res.status(403).json({ message: 'Refresh token đã hết hạn' });
        }

        const user = await User.findByPk(session.userId, { include: [{ model: Company }] });
        if (!user || !user.isActive) {
            await session.destroy();
            return res.status(403).json({ message: 'User không tồn tại hoặc đã bị khóa' });
        }

        const accessToken = signAccessToken(user, user.Company);
        return res.status(200).json({ accessToken });
    } catch (error) {
        console.error('Lỗi khi refresh token: ', error);
        return res.status(500).json({ message: 'Lỗi hệ thống !!!' });
    }
};
