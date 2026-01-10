import express, { Router } from 'express';

const router: Router = express.Router();

// Railway 會來戳這個確認服務是否正常
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

export default router;
