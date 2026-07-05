import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import { connectDB } from './libs/db.js';
import { protectedRoute } from './middlewares/authMiddleware.js';
import authRoute from './routes/authRoute.js';
import userRoute from './routes/userRoute.js';

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

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
});
