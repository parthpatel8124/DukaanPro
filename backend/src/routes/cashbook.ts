import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /api/cashbook - List cash book entries (optional date filter: ?date=YYYY-MM-DD)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { date } = req.query;
    const whereCondition = date ? { date: String(date) } : {};

    const entries = await prisma.cashBookEntry.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: entries });
  } catch (error) {
    console.error('CashBook GET error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch cash book entries' });
  }
});

// POST /api/cashbook - Save new cash in/out entry into DB for target date
router.post('/', async (req: Request, res: Response) => {
  try {
    const { type, category, amount, notes, date } = req.body;

    if (!type || !category || !amount) {
      res.status(400).json({ success: false, error: 'Missing required cashbook fields' });
      return;
    }

    const targetDate = date || new Date().toISOString().split('T')[0];

    const newEntry = await prisma.cashBookEntry.create({
      data: {
        type,
        category,
        amount: parseFloat(amount),
        notes: notes || '',
        date: targetDate
      }
    });

    res.status(201).json({ success: true, data: newEntry });
  } catch (error) {
    console.error('CashBook POST error:', error);
    res.status(500).json({ success: false, error: 'Failed to record cash entry in DB' });
  }
});

export default router;
