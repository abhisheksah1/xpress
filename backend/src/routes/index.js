import { Router } from 'express';
import authRoutes from './auth.routes.js';
import adminRoutes from './admin.routes.js';
import storeRoutes from './store.routes.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'KoseliXpress API is running' });
});

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/store', storeRoutes);

export default router;
