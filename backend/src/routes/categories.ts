import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

const DEFAULT_CATEGORIES = [
  { name: 'Smartphones', iconName: 'Smartphone', description: 'Mobile devices with Serial/IMEI tracking', hsnCode: '8517', gstRate: 18, trackingType: 'SERIALIZED', sortOrder: 1 },
  { name: 'Smart TVs & Displays', iconName: 'Tv', description: 'LED, OLED, QLED Smart TVs & Monitors', hsnCode: '8528', gstRate: 18, trackingType: 'SERIALIZED', sortOrder: 2 },
  { name: 'Laptops & Computers', iconName: 'Laptop', description: 'Notebooks, MacBooks & Desktop PCs', hsnCode: '8471', gstRate: 18, trackingType: 'SERIALIZED', sortOrder: 3 },
  { name: 'Air Conditioners', iconName: 'Wind', description: 'Split & Window AC Units with Serial tracking', hsnCode: '8415', gstRate: 28, trackingType: 'SERIALIZED', sortOrder: 4 },
  { name: 'Refrigerators & Appliances', iconName: 'Refrigerator', description: 'Single/Double door fridges & Washing machines', hsnCode: '8418', gstRate: 18, trackingType: 'SERIALIZED', sortOrder: 5 },
  { name: 'Chargers & Adapters', iconName: 'Zap', description: 'Wall chargers, fast chargers & laptop power bricks', hsnCode: '8504', gstRate: 18, trackingType: 'QUANTITY', sortOrder: 6 },
  { name: 'Data Cables', iconName: 'Zap', description: 'USB-C, Lightning, HDMI & DisplayPort Cables', hsnCode: '8544', gstRate: 18, trackingType: 'QUANTITY', sortOrder: 7 },
  { name: 'Earbuds & Audio', iconName: 'Headphones', description: 'TWS Earbuds, Soundbars & Bluetooth Speakers', hsnCode: '8518', gstRate: 18, trackingType: 'QUANTITY', sortOrder: 8 },
  { name: 'Cases & Protection', iconName: 'Shield', description: 'Back covers, tempered glass & laptop sleeves', hsnCode: '3926', gstRate: 18, trackingType: 'QUANTITY', sortOrder: 9 },
  { name: 'Other Accessories', iconName: 'Package', description: 'Memory cards, OTG adapters & general accessories', hsnCode: '8523', gstRate: 18, trackingType: 'QUANTITY', sortOrder: 10 }
];

// GET /api/categories - Fetch all category entries (ordered by sortOrder asc, name asc)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const categoryClient = (prisma as any).category;
    const count = await categoryClient.count();

    // Initial seed ONLY if table is completely empty
    if (count === 0) {
      for (const c of DEFAULT_CATEGORIES) {
        try {
          await categoryClient.create({ data: c });
        } catch (e) {
          // ignore individual seed error
        }
      }
    }

    const categories = await categoryClient.findMany({
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' }
      ]
    });

    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch categories' });
  }
});

// POST /api/categories - Create a new category
router.post('/', async (req: Request, res: Response) => {
  try {
    const categoryClient = (prisma as any).category;
    const { name, iconName, description, hsnCode, gstRate, trackingType, sortOrder, isActive } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, error: 'Category name is required' });
      return;
    }

    const trimmedName = name.trim();

    const existing = await categoryClient.findFirst({
      where: { name: { equals: trimmedName, mode: 'insensitive' } }
    });

    if (existing) {
      res.json({ success: true, data: existing, message: 'Category already exists' });
      return;
    }

    const category = await categoryClient.create({
      data: {
        name: trimmedName,
        iconName: iconName ? String(iconName).trim() : (trimmedName.toLowerCase().includes('watch') ? 'Watch' : 'Package'),
        description: description ? String(description).trim() : null,
        hsnCode: hsnCode ? String(hsnCode).trim() : '8517',
        gstRate: gstRate ? parseFloat(gstRate) : 18,
        trackingType: trackingType ? String(trackingType).trim() : 'SERIALIZED',
        sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : 0,
        isActive: isActive !== undefined ? Boolean(isActive) : true
      }
    });

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ success: false, error: 'Failed to create category' });
  }
});

// PUT /api/categories/:id - Update a category
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const categoryClient = (prisma as any).category;
    const id = String(req.params.id);
    const { name, iconName, description, hsnCode, gstRate, trackingType, sortOrder, isActive } = req.body;

    const existing: any = await categoryClient.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Category not found' });
      return;
    }

    const updated = await categoryClient.update({
      where: { id },
      data: {
        name: name !== undefined ? String(name).trim() : existing.name,
        iconName: iconName !== undefined ? (iconName ? String(iconName).trim() : 'Package') : existing.iconName,
        description: description !== undefined ? (description ? String(description).trim() : null) : existing.description,
        hsnCode: hsnCode !== undefined ? String(hsnCode).trim() : existing.hsnCode,
        gstRate: gstRate !== undefined ? parseFloat(gstRate) : existing.gstRate,
        trackingType: trackingType !== undefined ? String(trackingType).trim() : existing.trackingType,
        sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : existing.sortOrder,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive
      }
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ success: false, error: 'Failed to update category' });
  }
});

// DELETE /api/categories/:id - Delete a category
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const categoryClient = (prisma as any).category;
    const id = String(req.params.id);
    await categoryClient.delete({ where: { id } });
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ success: false, error: 'Failed to delete category' });
  }
});

export default router;
