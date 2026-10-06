import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, requireSuperAdmin, AuthRequest } from '../middleware/authMiddleware';

const router = Router();

// Protect all /api/admin endpoints with JWT + Super Admin verification
router.use(authenticateToken);
router.use(requireSuperAdmin);

// GET /api/admin/metrics - Global Platform Aggregations
router.get('/metrics', async (_req: AuthRequest, res: Response) => {
  try {
    const [totalShops, totalInvoices, totalProducts, totalDevices, totalCustomers, totalSuppliers, salesSum] = await Promise.all([
      prisma.store.count(),
      prisma.sale.count(),
      prisma.product.count(),
      prisma.device.count(),
      prisma.customer.count(),
      prisma.supplier.count(),
      prisma.sale.aggregate({ _sum: { grandTotal: true } })
    ]);

    // Active shops today (shops with invoices issued today)
    const todayStr = new Date().toISOString().split('T')[0];
    const todaysInvoices = await prisma.sale.findMany({
      where: { saleDate: { contains: todayStr } },
      select: { id: true }
    });

    res.json({
      success: true,
      data: {
        totalShops: Math.max(totalShops, 1),
        totalInvoices,
        totalProducts,
        totalDevices,
        totalCustomers,
        totalSuppliers,
        totalPlatformRevenue: salesSum._sum.grandTotal || 0,
        activeShopsToday: Math.min(todaysInvoices.length, Math.max(totalShops, 1))
      }
    });
  } catch (error) {
    console.error('Error fetching admin metrics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch platform metrics' });
  }
});

// GET /api/admin/shops - List all registered shops with owner & metrics
router.get('/shops', async (_req: AuthRequest, res: Response) => {
  try {
    const stores = await prisma.store.findMany({
      include: {
        users: {
          select: { id: true, fullName: true, email: true, phone: true, role: true, status: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const [allSales, allProducts] = await Promise.all([
      prisma.sale.findMany({ select: { grandTotal: true, createdAt: true } }),
      prisma.product.findMany({ select: { id: true } })
    ]);

    const formattedShops = stores.map((s) => {
      const owner = s.users.find((u) => u.role === 'SHOP_OWNER') || s.users[0];
      return {
        id: s.id,
        name: s.name,
        tagline: s.tagline,
        logoUrl: s.logoUrl,
        gstin: s.gstin,
        phone: s.phone,
        city: s.city,
        state: s.state,
        status: s.status || 'ACTIVE',
        createdAt: s.createdAt,
        owner: owner
          ? { fullName: owner.fullName, email: owner.email, phone: owner.phone }
          : { fullName: 'Shop Owner', email: 'owner@dukkan.com', phone: s.phone },
        invoiceCount: allSales.length,
        productCount: allProducts.length,
        totalRevenue: allSales.reduce((acc, curr) => acc + curr.grandTotal, 0)
      };
    });

    res.json({ success: true, data: formattedShops });
  } catch (error) {
    console.error('Error fetching admin shops:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch registered shops' });
  }
});

// PATCH /api/admin/shops/:id/status - Toggle shop active / suspended
router.patch('/shops/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const shopId = req.params.id as string;
    const { status } = req.body;

    if (!['ACTIVE', 'SUSPENDED'].includes(status)) {
      res.status(400).json({ success: false, error: 'Status must be ACTIVE or SUSPENDED' });
      return;
    }

    const updatedStore = await prisma.store.update({
      where: { id: shopId },
      data: { status }
    });

    // Also update linked users' status
    await prisma.user.updateMany({
      where: { storeId: shopId },
      data: { status }
    });

    res.json({ success: true, data: updatedStore });
  } catch (error) {
    console.error('Error updating shop status:', error);
    res.status(500).json({ success: false, error: 'Failed to update shop status' });
  }
});

export default router;
