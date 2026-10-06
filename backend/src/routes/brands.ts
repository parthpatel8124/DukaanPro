import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// Default initial brands list for mobile & electronics stores with sort order
const DEFAULT_BRANDS = [
  { name: 'Apple', logoUrl: 'https://cdn-icons-png.flaticon.com/512/0/747.png', sortOrder: 1 },
  { name: 'Samsung', logoUrl: 'https://cdn-icons-png.flaticon.com/512/5969/5969116.png', sortOrder: 2 },
  { name: 'Vivo', logoUrl: 'https://images.seeklogo.com/logo-png/30/1/vivo-logo-png_seeklogo-305395.png', sortOrder: 3 },
  { name: 'Oppo', logoUrl: 'https://cdn-icons-png.flaticon.com/512/882/882745.png', sortOrder: 4 },
  { name: 'Xiaomi', logoUrl: 'https://images.icon-icons.com/1826/PNG/512/4202040logomobilesocialsocialmediaxiaomi-115648_115653.png', sortOrder: 5 },
  { name: 'Realme', logoUrl: 'https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/realme-mobile-logo-icon.png', sortOrder: 6 },
  { name: 'OnePlus', logoUrl: 'https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/oneplus-mobile-logo-icon.png', sortOrder: 7 },
  { name: 'Sony', logoUrl: null, sortOrder: 8 },
  { name: 'LG', logoUrl: null, sortOrder: 9 },
  { name: 'Dell', logoUrl: null, sortOrder: 10 },
  { name: 'HP', logoUrl: null, sortOrder: 11 },
  { name: 'Lenovo', logoUrl: null, sortOrder: 12 },
  { name: 'Voltas', logoUrl: null, sortOrder: 13 },
  { name: 'Daikin', logoUrl: null, sortOrder: 14 },
  { name: 'Haier', logoUrl: null, sortOrder: 15 },
  { name: 'Godrej', logoUrl: null, sortOrder: 16 },
  { name: 'Whirlpool', logoUrl: null, sortOrder: 17 },
  { name: 'boAt', logoUrl: 'https://images.seeklogo.com/logo-png/37/1/boat-logo-png_seeklogo-379185.png', sortOrder: 18 },
  { name: 'Noise', logoUrl: 'https://pimwp.s3-accelerate.amazonaws.com/2023/09/Untitled-design-2023-09-25T203314.500.png', sortOrder: 19 },
  { name: 'Portronics', logoUrl: null, sortOrder: 20 },
  { name: 'Zebronics', logoUrl: null, sortOrder: 21 },
  { name: 'ERD', logoUrl: null, sortOrder: 22 }
];

// GET /api/brands - Fetch all brand master entries (ordered by sortOrder asc, then name asc)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const brandClient = (prisma as any).brand;
    const count = await brandClient.count();

    // 1. Initial seed ONLY if table is completely empty
    if (count === 0) {
      for (const b of DEFAULT_BRANDS) {
        try {
          await brandClient.create({ data: b });
        } catch (e) {
          // ignore seed errors
        }
      }
    }

    const brands = await brandClient.findMany({
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' }
      ]
    });

    res.json({ success: true, data: brands });
  } catch (error) {
    console.error('Error fetching brands:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch brands' });
  }
});

// POST /api/brands - Create a new brand entry
router.post('/', async (req: Request, res: Response) => {
  try {
    const brandClient = (prisma as any).brand;
    const { name, logoUrl, sortOrder, isActive } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, error: 'Brand name is required' });
      return;
    }

    const trimmedName = name.trim();

    // Check existing
    const existing = await brandClient.findFirst({
      where: { name: { equals: trimmedName, mode: 'insensitive' } }
    });

    if (existing) {
      res.json({ success: true, data: existing, message: 'Brand already exists' });
      return;
    }

    const brand = await brandClient.create({
      data: {
        name: trimmedName,
        logoUrl: logoUrl || null,
        sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : 0,
        isActive: isActive !== undefined ? Boolean(isActive) : true
      }
    });

    res.status(201).json({ success: true, data: brand });
  } catch (error) {
    console.error('Error creating brand:', error);
    res.status(500).json({ success: false, error: 'Failed to create brand' });
  }
});

// PUT /api/brands/:id - Update brand name, logo, priority order, or active status
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const brandClient = (prisma as any).brand;
    const id = String(req.params.id);
    const { name, logoUrl, sortOrder, isActive } = req.body;

    const existing: any = await brandClient.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Brand not found' });
      return;
    }

    const updated = await brandClient.update({
      where: { id },
      data: {
        name: name !== undefined ? String(name).trim() : existing.name,
        logoUrl: logoUrl !== undefined ? (logoUrl ? String(logoUrl) : null) : existing.logoUrl,
        sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : existing.sortOrder,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive
      }
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating brand:', error);
    res.status(500).json({ success: false, error: 'Failed to update brand' });
  }
});

// DELETE /api/brands/:id - Delete a brand entry
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    await prisma.brand.delete({ where: { id } });
    res.json({ success: true, message: 'Brand deleted successfully' });
  } catch (error) {
    console.error('Error deleting brand:', error);
    res.status(500).json({ success: false, error: 'Failed to delete brand' });
  }
});

export default router;
