import express from 'express';
import { signupTenant, signIn, signOut, refreshToken } from '../controllers/authController.js';

const router = express.Router();

router.post('/signup-tenant', signupTenant);
router.post('/signin', signIn);
router.post('/signout', signOut);
router.post('/refresh', refreshToken);

export default router;
