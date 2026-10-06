import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

const DEFAULT_TAX_SLABS = [
  { name: 'GST 18% Standard Mobile & Electronics', gstRate: 18, cgstRate: 9, sgstRate: 9, hsnCode: '8517', description: 'Standard GST rate for mobile phones, chargers, audio & electronics', isDefault: true },
  { name: 'GST 12% Accessory Rate', gstRate: 12, cgstRate: 6, sgstRate: 6, hsnCode: '8504', description: 'Reduced rate for specific mobile components & accessories', isDefault: false },
  { name: 'GST 28% Luxury & High-End Audio', gstRate: 28, cgstRate: 14, sgstRate: 14, hsnCode: '8518', description: 'Luxury rate for high-end audio devices & gaming gear', isDefault: false },
  { name: 'GST 5% Raw Components', gstRate: 5, cgstRate: 2.5, sgstRate: 2.5, hsnCode: '8544', description: 'Basic electronic wires & spare parts', isDefault: false },
  { name: 'GST 0% Exempt Goods', gstRate: 0, cgstRate: 0, sgstRate: 0, hsnCode: '0000', description: 'Exempted second-hand non-GST items', isDefault: false }
];

// GET /api/taxes - Fetch all tax slabs (auto-seed standard GST tax slabs if empty)
router.get('/', async (_req: Request, res: Response) => {
  try {
    let taxes = await prisma.taxSlab.findMany({
      orderBy: { gstRate: 'asc' }
    });

    if (taxes.length === 0) {
      for (const t of DEFAULT_TAX_SLABS) {
        try {
          await prisma.taxSlab.create({ data: t });
        } catch (e) {
          // ignore duplicate errors during seed
        }
      }
      taxes = await prisma.taxSlab.findMany({
        orderBy: { gstRate: 'asc' }
      });
    }

    res.json({ success: true, data: taxes });
  } catch (error) {
    console.error('Error fetching tax slabs:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch tax slabs' });
  }
});

// POST /api/taxes - Create a new tax slab
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, gstRate, cgstRate, sgstRate, hsnCode, description, isDefault } = req.body;

    if (gstRate === undefined || isNaN(parseFloat(gstRate))) {
      res.status(400).json({ success: false, error: 'Valid GST rate percentage is required' });
      return;
    }

    const rateNum = parseFloat(gstRate);

    const existing = await prisma.taxSlab.findFirst({
      where: { gstRate: rateNum }
    });

    if (existing) {
      res.json({ success: true, data: existing, message: 'Tax slab with this rate already exists' });
      return;
    }

    if (isDefault) {
      // Clear other defaults
      await prisma.taxSlab.updateMany({ data: { isDefault: false } });
    }

    const taxSlab = await prisma.taxSlab.create({
      data: {
        name: name ? String(name).trim() : `GST ${rateNum}%`,
        gstRate: rateNum,
        cgstRate: cgstRate !== undefined ? parseFloat(cgstRate) : rateNum / 2,
        sgstRate: sgstRate !== undefined ? parseFloat(sgstRate) : rateNum / 2,
        hsnCode: hsnCode ? String(hsnCode).trim() : '8517',
        description: description ? String(description).trim() : null,
        isDefault: Boolean(isDefault)
      }
    });

    res.status(201).json({ success: true, data: taxSlab });
  } catch (error) {
    console.error('Error creating tax slab:', error);
    res.status(500).json({ success: false, error: 'Failed to create tax slab' });
  }
});

// PUT /api/taxes/:id - Update a tax slab
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { name, gstRate, cgstRate, sgstRate, hsnCode, description, isDefault } = req.body;

    const existing = await prisma.taxSlab.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Tax slab not found' });
      return;
    }

    if (isDefault) {
      await prisma.taxSlab.updateMany({ data: { isDefault: false } });
    }

    const rateNum = gstRate !== undefined ? parseFloat(gstRate) : existing.gstRate;

    const updated = await prisma.taxSlab.update({
      where: { id },
      data: {
        name: name !== undefined ? String(name).trim() : existing.name,
        gstRate: rateNum,
        cgstRate: cgstRate !== undefined ? parseFloat(cgstRate) : rateNum / 2,
        sgstRate: sgstRate !== undefined ? parseFloat(sgstRate) : rateNum / 2,
        hsnCode: hsnCode !== undefined ? String(hsnCode).trim() : existing.hsnCode,
        description: description !== undefined ? (description ? String(description).trim() : null) : existing.description,
        isDefault: isDefault !== undefined ? Boolean(isDefault) : existing.isDefault
      }
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating tax slab:', error);
    res.status(500).json({ success: false, error: 'Failed to update tax slab' });
  }
});

// DELETE /api/taxes/:id - Delete a tax slab
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    await prisma.taxSlab.delete({ where: { id } });
    res.json({ success: true, message: 'Tax slab deleted successfully' });
  } catch (error) {
    console.error('Error deleting tax slab:', error);
    res.status(500).json({ success: false, error: 'Failed to delete tax slab' });
  }
});

export default router;
