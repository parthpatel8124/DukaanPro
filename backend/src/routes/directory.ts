import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /api/directory/customers - List all customers with live dynamically calculated totalOutstanding
router.get('/customers', async (_req: Request, res: Response) => {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: 'desc' }
    });

    const activeFinanceRecords = await prisma.financeRecord.findMany({
      where: { status: 'ACTIVE' }
    });

    // Dynamically calculate live outstanding Udhar balance for each customer
    const updatedCustomers = customers.map((cust) => {
      const matchingLoans = activeFinanceRecords.filter(
        (f) =>
          (f.customerId && f.customerId === cust.id) ||
          (f.customerPhone && f.customerPhone.trim() === cust.mobileNumber.trim()) ||
          (f.customerName && f.customerName.trim().toLowerCase() === cust.fullName.trim().toLowerCase())
      );

      const liveOutstanding = matchingLoans.reduce((sum, loan) => sum + loan.currentBalance, 0);

      return {
        ...cust,
        totalOutstanding: liveOutstanding
      };
    });

    res.json({ success: true, data: updatedCustomers });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch customers' });
  }
});

// POST /api/directory/customers - Create new customer in DB
router.post('/customers', async (req: Request, res: Response) => {
  try {
    const { fullName, mobileNumber, address, city, state } = req.body;

    if (!fullName || !mobileNumber) {
      res.status(400).json({ success: false, error: 'Customer name and mobile number are required' });
      return;
    }

    // Calculate existing active Udhar balance if any loan already exists for this phone/name
    const existingLoans = await prisma.financeRecord.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { customerPhone: mobileNumber.trim() },
          { customerName: { equals: fullName.trim(), mode: 'insensitive' } }
        ]
      }
    });

    const initialOutstanding = existingLoans.reduce((sum, r) => sum + r.currentBalance, 0);

    const newCustomer = await prisma.customer.upsert({
      where: { mobileNumber: mobileNumber.trim() },
      update: {
        fullName: fullName.trim(),
        address: address || undefined,
        city: city || undefined,
        state: state || undefined,
        totalOutstanding: initialOutstanding
      },
      create: {
        fullName: fullName.trim(),
        mobileNumber: mobileNumber.trim(),
        address: address || '',
        city: city || 'Delhi',
        state: state || 'Delhi',
        totalOutstanding: initialOutstanding
      }
    });

    res.status(201).json({ success: true, data: newCustomer });
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ success: false, error: 'Failed to create customer' });
  }
});

// GET /api/directory/suppliers - List all suppliers
router.get('/suppliers', async (_req: Request, res: Response) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: suppliers });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch suppliers' });
  }
});

// POST /api/directory/suppliers - Create new supplier in DB
router.post('/suppliers', async (req: Request, res: Response) => {
  try {
    const { companyName, contactName, phone, email, address, gstin, outstandingBalance } = req.body;

    if (!companyName || !phone) {
      res.status(400).json({ success: false, error: 'Company name and phone number are required' });
      return;
    }

    const newSupplier = await prisma.supplier.upsert({
      where: { phone: phone.trim() },
      update: {
        companyName,
        contactName,
        email,
        address,
        gstin,
        outstandingBalance: parseFloat(outstandingBalance || '0')
      },
      create: {
        companyName,
        contactName: contactName || '',
        phone: phone.trim(),
        email: email || '',
        address: address || '',
        gstin: gstin || '',
        outstandingBalance: parseFloat(outstandingBalance || '0')
      }
    });

    res.status(201).json({ success: true, data: newSupplier });
  } catch (error) {
    console.error('Error creating supplier:', error);
    res.status(500).json({ success: false, error: 'Failed to create supplier' });
  }
});

export default router;
