import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import { connectDB } from './libs/db.js';
import { protectedRoute } from './middlewares/authMiddleware.js';
import { tenantMiddleware } from './middlewares/tenantMiddleware.js';
import authRoute from './routes/authRoute.js';
import userRoute from './routes/userRoute.js';
import branchRoute from './routes/branchRoute.js';
import departmentRoute from './routes/departmentRoute.js';
import positionRoute from './routes/positionRoute.js';
import levelRoute from './routes/levelRoute.js';
import employeeRoute from './routes/employeeRoute.js';
import uploadRoute from './routes/uploadRoute.js';
import shiftRoute from './routes/shiftRoute.js';
import workScheduleRoute from './routes/workScheduleRoute.js';
import attendanceRoute from './routes/attendanceRoute.js';

const app = express();
const PORT = process.env.PORT || 5001;

app.use(express.json());
app.use(cookieParser());

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim());

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        if (process.env.NODE_ENV !== 'production' && /^http:\/\/localhost(:\d+)?$/.test(origin)) {
            return callback(null, true);
        }
        callback(new Error(`Origin ${origin} không được phép bởi CORS`));
    },
    credentials: true,
}));

// Public
app.use('/api/auth', authRoute);

// Protected — tất cả route bên dưới cần JWT hợp lệ.
// Tenant scoping xử lý bên trong từng route file (userRoute dùng tenantMiddleware nội bộ).
app.use('/api/users', protectedRoute, userRoute);

// Tenant-only routes — bắt buộc là tenant user (không phải super_admin).
app.use('/api/branches', protectedRoute, tenantMiddleware, branchRoute);
app.use('/api/departments', protectedRoute, tenantMiddleware, departmentRoute);
app.use('/api/positions', protectedRoute, tenantMiddleware, positionRoute);
app.use('/api/levels', protectedRoute, tenantMiddleware, levelRoute);
app.use('/api/employees', protectedRoute, tenantMiddleware, employeeRoute);
app.use('/api/uploads', protectedRoute, tenantMiddleware, uploadRoute);
app.use('/api/shifts', protectedRoute, tenantMiddleware, shiftRoute);
app.use('/api/work-schedules', protectedRoute, tenantMiddleware, workScheduleRoute);
app.use('/api/attendances', protectedRoute, tenantMiddleware, attendanceRoute);

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
});
