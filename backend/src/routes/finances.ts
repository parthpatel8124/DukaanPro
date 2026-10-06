import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// Helper to recalculate & update customer totalOutstanding in DB
async function syncCustomerOutstanding(customerId?: string, customerPhone?: string, customerName?: string) {
  try {
    let cust = null;
    if (customerId) {
      cust = await prisma.customer.findUnique({ where: { id: customerId } });
    }
    if (!cust && customerPhone) {
      cust = await prisma.customer.findUnique({ where: { mobileNumber: customerPhone.trim() } });
    }
    if (!cust && customerName) {
      cust = await prisma.customer.findFirst({
        where: { fullName: { equals: customerName.trim(), mode: 'insensitive' } }
      });
    }

    if (cust) {
      const activeLoans = await prisma.financeRecord.findMany({
        where: {
          status: 'ACTIVE',
          OR: [
            { customerId: cust.id },
            { customerPhone: cust.mobileNumber },
            { customerName: { equals: cust.fullName, mode: 'insensitive' } }
          ]
        }
      });
      const sumBal = activeLoans.reduce((sum, r) => sum + r.currentBalance, 0);

      await prisma.customer.update({
        where: { id: cust.id },
        data: { totalOutstanding: sumBal }
      });
    }
  } catch (e) {
    console.warn('Could not sync customer outstanding:', e);
  }
}

// GET /api/finances - List all personal finance records & payment timeline from DB
router.get('/', async (_req: Request, res: Response) => {
  try {
    const records = await prisma.financeRecord.findMany({
      include: { payments: true },
      orderBy: { createdAt: 'desc' }
    });

    const formattedRecords = records.map((r: any) => ({
      id: r.id,
      customerId: r.customerId,
      customerName: r.customerName,
      customerPhone: r.customerPhone,
      address: r.address || '',
      productDetails: r.productDetails,
      purchaseDate: r.purchaseDate,
      totalProductPrice: r.totalProductPrice,
      downPayment: r.downPayment,
      interestAmount: r.interestAmount || 0,
      totalPayable: (r.totalProductPrice - r.downPayment + (r.interestAmount || 0)),
      principalRemaining: r.principalRemaining,
      interestRateMonthly: r.interestRateMonthly,
      totalInterestAccumulated: r.totalInterestAccumulated,
      totalPaid: r.totalPaid,
      currentBalance: r.currentBalance,
      status: r.status,
      paymentsHistory: (r.payments || []).map((p: any) => ({
        id: p.id,
        receiptNo: p.receiptNo,
        amount: p.amount,
        paymentDate: p.paymentDate,
        paymentMethod: p.paymentMethod,
        notes: p.notes || ''
      }))
    }));

    res.json({ success: true, data: formattedRecords });
  } catch (error) {
    console.error('Error fetching finances:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch finance accounts' });
  }
});

// POST /api/finances/payment - Record partial payment against loan in DB
router.post('/payment', async (req: Request, res: Response) => {
  try {
    const { financeId, amount, paymentMethod, notes, paymentDate } = req.body;

    if (!financeId || !amount) {
      res.status(400).json({ success: false, error: 'Missing required payment fields' });
      return;
    }

    const payAmountNum = parseFloat(amount);

    const record = await prisma.financeRecord.findUnique({
      where: { id: financeId }
    });

    if (!record) {
      res.status(404).json({ success: false, error: 'Finance record not found' });
      return;
    }

    const newTotalPaid = record.totalPaid + payAmountNum;
    const newBalance = Math.max(0, record.currentBalance - payAmountNum);
    const newStatus = newBalance === 0 ? 'PAID_OFF' : 'ACTIVE';

    const receiptNo = `REC-${Math.floor(1000 + Math.random() * 9000)}`;
    const todayStr = paymentDate || new Date().toISOString().split('T')[0];

    // Transaction: Create Payment & Update Finance Record
    const [updatedRecord, newPayment] = await prisma.$transaction([
      prisma.financeRecord.update({
        where: { id: financeId },
        data: {
          totalPaid: newTotalPaid,
          currentBalance: newBalance,
          status: newStatus
        }
      }),
      prisma.financePayment.create({
        data: {
          financeId,
          receiptNo,
          amount: payAmountNum,
          paymentDate: todayStr,
          paymentMethod: paymentMethod || 'UPI',
          notes: notes || 'Udhar Repayment'
        }
      })
    ]);

    // Also record in CashBook
    await prisma.cashBookEntry.create({
      data: {
        type: 'CASH_IN',
        category: 'Udhar EMI Collection',
        amount: payAmountNum,
        notes: `Receipt #${receiptNo} - ${record.customerName} (${record.productDetails})`,
        date: todayStr
      }
    });

    // Sync Customer Total Outstanding
    await syncCustomerOutstanding(record.customerId, record.customerPhone, record.customerName);

    res.status(201).json({
      success: true,
      data: {
        finance: updatedRecord,
        payment: newPayment
      }
    });
  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({ success: false, error: 'Failed to process finance payment' });
  }
});

// POST /api/finances/new - Create new personal finance loan record in DB
router.post('/new', async (req: Request, res: Response) => {
  try {
    const {
      customerId,
      customerName,
      customerPhone,
      address,
      productDetails,
      purchaseDate,
      totalProductPrice,
      downPayment,
      interestAmount
    } = req.body;

    const priceNum = parseFloat(totalProductPrice || '0');
    const downNum = parseFloat(downPayment || '0');
    const interestNum = parseFloat(interestAmount || '0');
    const remainingBalance = priceNum - downNum + interestNum;

    // Find or create customer to satisfy foreign key constraint safely
    let targetCustomer = customerId ? await prisma.customer.findUnique({ where: { id: customerId } }) : null;
    if (!targetCustomer && customerPhone) {
      targetCustomer = await prisma.customer.findUnique({ where: { mobileNumber: customerPhone.trim() } });
    }

    if (!targetCustomer) {
      targetCustomer = await prisma.customer.upsert({
        where: { mobileNumber: customerPhone || `temp-${Date.now()}` },
        update: { fullName: customerName, address: address || undefined },
        create: {
          fullName: customerName,
          mobileNumber: customerPhone || `temp-${Date.now()}`,
          address: address || '',
          totalOutstanding: remainingBalance
        }
      });
    }

    const newRecord = await prisma.financeRecord.create({
      data: {
        customerId: targetCustomer.id,
        customerName,
        customerPhone,
        address: address || '',
        productDetails: productDetails || 'Mobile Device',
        purchaseDate: purchaseDate || new Date().toISOString().split('T')[0],
        totalProductPrice: priceNum,
        downPayment: downNum,
        interestAmount: interestNum,
        principalRemaining: remainingBalance,
        totalPaid: 0,
        currentBalance: remainingBalance,
        status: 'ACTIVE',
        payments: {
          create: downNum > 0 ? [
            {
              receiptNo: `REC-DP-${Math.floor(1000 + Math.random() * 9000)}`,
              amount: downNum,
              paymentDate: purchaseDate || new Date().toISOString().split('T')[0],
              paymentMethod: 'CASH',
              notes: 'Initial Down Payment'
            }
          ] : []
        }
      }
    });

    // Sync Customer Total Outstanding
    await syncCustomerOutstanding(targetCustomer.id, customerPhone, customerName);

    res.status(201).json({ success: true, data: newRecord });
  } catch (error) {
    console.error('Error creating finance account:', error);
    res.status(500).json({ success: false, error: 'Failed to create finance account' });
  }
});

export default router;
