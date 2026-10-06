import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /api/store - Fetch shop / business profile
router.get('/', async (_req: Request, res: Response) => {
  try {
    let store = await prisma.store.findFirst();
    if (!store) {
      store = await prisma.store.create({
        data: {
          name: 'KISHAN',
          tagline: 'ELECTRONICS',
          gstin: '24AUJPP7785L1ZR',
          phone: '9974127474',
          address: 'Bazar Street',
          city: 'VALOD',
          district: 'Tapi',
          state: 'Gujarat',
          pincode: '394640',
          jurisdiction: 'VALOD',
          terms: 'Warranty to customer is directly from manufacturers. Dealer is not responsible to customer in any way. Goods once sold will not be taken back or exchanged.'
        }
      });
    }
    res.json({ success: true, data: store });
  } catch (error) {
    console.error('Error fetching store profile:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch store profile' });
  }
});

// PUT /api/store - Update shop / business profile
router.put('/', async (req: Request, res: Response) => {
  try {
    const {
      name,
      tagline,
      logoUrl,
      gstin,
      phone,
      address,
      city,
      district,
      state,
      pincode,
      jurisdiction,
      terms
    } = req.body;

    let store = await prisma.store.findFirst();
    if (store) {
      store = await prisma.store.update({
        where: { id: store.id },
        data: {
          name: name || 'KISHAN',
          tagline: tagline || 'ELECTRONICS',
          logoUrl: logoUrl !== undefined ? logoUrl : store.logoUrl,
          gstin: gstin || '24AUJPP7785L1ZR',
          phone: phone || '9974127474',
          address: address || '',
          city: city || 'VALOD',
          district: district || 'Tapi',
          state: state || 'Gujarat',
          pincode: pincode || '394640',
          jurisdiction: jurisdiction || 'VALOD',
          terms: terms || ''
        }
      });
    } else {
      store = await prisma.store.create({
        data: {
          name: name || 'KISHAN',
          tagline: tagline || 'ELECTRONICS',
          logoUrl: logoUrl || null,
          gstin: gstin || '24AUJPP7785L1ZR',
          phone: phone || '9974127474',
          address: address || '',
          city: city || 'VALOD',
          district: district || 'Tapi',
          state: state || 'Gujarat',
          pincode: pincode || '394640',
          jurisdiction: jurisdiction || 'VALOD',
          terms: terms || ''
        }
      });
    }

    res.json({ success: true, data: store });
  } catch (error) {
    console.error('Error updating store profile:', error);
    res.status(500).json({ success: false, error: 'Failed to update store profile' });
  }
});

export default router;
