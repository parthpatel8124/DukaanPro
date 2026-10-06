import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /api/sales - List all bill book invoices from DB (Cross-referenced with active Udhar)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const sales = await prisma.sale.findMany({
      include: { items: true },
      orderBy: { createdAt: 'desc' }
    });

    const activeFinances = await prisma.financeRecord.findMany({
      include: { payments: true }
    });

    const mappedSales = sales.map((s) => {
      // Cross-reference with active Udhar records for this customer or invoice
      const matchingFinance = activeFinances.find((f) => 
        (f.customerPhone && f.customerPhone.trim() === s.customerPhone.trim()) ||
        f.payments.some(p => p.notes && p.notes.includes(s.invoiceNo))
      );

      if (matchingFinance) {
        return {
          ...s,
          paidAmount: matchingFinance.totalPaid,
          dueAmount: matchingFinance.currentBalance,
          paymentMethod: matchingFinance.currentBalance > 0 ? 'UDHAR' : s.paymentMethod
        };
      }

      // Default calculation if no finance record exists
      const currentDue = s.dueAmount !== undefined ? s.dueAmount : 0;
      return {
        ...s,
        dueAmount: currentDue,
        paidAmount: s.paidAmount !== undefined ? s.paidAmount : (s.grandTotal - currentDue)
      };
    });

    res.json({ success: true, data: mappedSales });
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch sales invoices' });
  }
});

// POST /api/sales - Create new Tax Invoice & Link to CashBook, Udhar, and Stock
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      customerName,
      customerPhone,
      address,
      items,
      subTotal,
      gstTotal,
      discount,
      grandTotal,
      paidAmount,
      dueAmount,
      paymentMethod,
      isGstInvoice,
      customInterest
    } = req.body;

    if (!items || items.length === 0) {
      res.status(400).json({ success: false, error: 'Invoice items cannot be empty' });
      return;
    }

    const gTotalNum = parseFloat(grandTotal || '0');
    const paidNum = parseFloat(paidAmount !== undefined ? paidAmount : grandTotal || '0');
    const pendingDueNum = Math.max(0, parseFloat(dueAmount !== undefined ? dueAmount : (gTotalNum - paidNum).toString()));

    const invoiceNo = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const saleDateStr = new Date().toISOString().split('T')[0];

    // 1. Create Sale Record in PostgreSQL
    const newSale = await prisma.sale.create({
      data: {
        invoiceNo,
        customerName: customerName || 'Walk-in Customer',
        customerPhone: customerPhone || '9999999999',
        subTotal: parseFloat(subTotal || '0'),
        gstTotal: parseFloat(gstTotal || '0'),
        discount: parseFloat(discount || '0'),
        grandTotal: gTotalNum,
        paidAmount: paidNum,
        dueAmount: pendingDueNum,
        paymentMethod: paymentMethod || 'CASH',
        saleDate: saleDateStr,
        isGstInvoice: isGstInvoice ?? true,
        items: {
          create: items.map((it: any) => ({
            productName: it.productName,
            quantity: Number(it.quantity || 1),
            unitPrice: parseFloat(it.unitPrice || '0'),
            gstRate: parseFloat(it.gstRate || '18'),
            total: parseFloat(it.total || '0'),
            imei: it.imei || null
          }))
        }
      },
      include: { items: true }
    });

    // 2. Linkage to Daily Log Book (CashBook Entry if paid > 0)
    if (paidNum > 0) {
      await prisma.cashBookEntry.create({
        data: {
          type: 'CASH_IN',
          category: 'Counter Sale Bill',
          amount: paidNum,
          notes: `Invoice #${invoiceNo} - ${customerName || 'Customer'} (${customerPhone || ''})`,
          date: saleDateStr
        }
      });
    }

    // 3. Linkage to Personal Finance / Udhar (if due > 0)
    if (pendingDueNum > 0 && customerPhone) {
      // Find or create customer
      const targetCustomer = await prisma.customer.upsert({
        where: { mobileNumber: customerPhone.trim() },
        update: { fullName: customerName || 'Customer', address: address || undefined },
        create: {
          fullName: customerName || 'Customer',
          mobileNumber: customerPhone.trim(),
          address: address || '',
          totalOutstanding: pendingDueNum
        }
      });

      const productDetailsSummary = items.map((it: any) => `${it.productName} (x${it.quantity})`).join(', ');
      const interestNum = parseFloat(customInterest || '0');
      const netDue = pendingDueNum + interestNum;

      await prisma.financeRecord.create({
        data: {
          customerId: targetCustomer.id,
          customerName: customerName || 'Customer',
          customerPhone: customerPhone.trim(),
          address: address || '',
          productDetails: productDetailsSummary || 'Bill Book Sale',
          purchaseDate: saleDateStr,
          totalProductPrice: gTotalNum,
          downPayment: paidNum,
          interestAmount: interestNum,
          principalRemaining: netDue,
          totalPaid: paidNum,
          currentBalance: netDue,
          status: 'ACTIVE',
          payments: {
            create: paidNum > 0 ? [
              {
                receiptNo: `REC-DP-${Math.floor(1000 + Math.random() * 9000)}`,
                amount: paidNum,
                paymentDate: saleDateStr,
                paymentMethod: paymentMethod || 'CASH',
                notes: `Initial Down Payment (Invoice #${invoiceNo})`
              }
            ] : []
          }
        }
      });

      // Recalculate & Sync Customer's totalOutstanding in DB
      const activeForCust = await prisma.financeRecord.findMany({
        where: {
          status: 'ACTIVE',
          OR: [
            { customerId: targetCustomer.id },
            { customerPhone: customerPhone.trim() }
          ]
        }
      });

      const sumOutstanding = activeForCust.reduce((s, r) => s + r.currentBalance, 0);
      await prisma.customer.update({
        where: { id: targetCustomer.id },
        data: { totalOutstanding: sumOutstanding }
      });
    }

    // 4. Linkage to Stock & Inventory Reduction
    for (const item of items) {
      if (item.productId) {
        try {
          const product = await prisma.product.findUnique({ where: { id: item.productId } });
          if (product) {
            const newQty = Math.max(0, product.stockQuantity - Number(item.quantity || 1));
            const newStatus = newQty <= 0 ? 'OUT_OF_STOCK' : newQty <= product.minStockAlert ? 'LOW_STOCK' : 'IN_STOCK';

            await prisma.product.update({
              where: { id: item.productId },
              data: {
                stockQuantity: newQty,
                status: newStatus
              }
            });
          }
        } catch (e) {
          console.warn('Could not reduce stock for item:', item.productId, e);
        }
      }
    }

    res.status(201).json({ success: true, data: newSale });
  } catch (error) {
    console.error('Sale creation error:', error);
    res.status(500).json({ success: false, error: 'Failed to create sales invoice' });
  }
});

// POST /api/sales/:id/payment - Record payment received on a pending invoice
router.post('/:id/payment', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { amount, paymentMethod } = req.body;
    const paymentNum = parseFloat(amount || '0');

    if (paymentNum <= 0) {
      res.status(400).json({ success: false, error: 'Payment amount must be greater than 0' });
      return;
    }

    const sale = await prisma.sale.findUnique({ where: { id } });
    if (!sale) {
      res.status(404).json({ success: false, error: 'Sale invoice not found' });
      return;
    }

    const newPaidAmount = sale.paidAmount + paymentNum;
    const newDueAmount = Math.max(0, sale.grandTotal - newPaidAmount);

    const updatedSale = await prisma.sale.update({
      where: { id },
      data: {
        paidAmount: newPaidAmount,
        dueAmount: newDueAmount
      }
    });

    // 1. Check if there's a matching FinanceRecord (Udhar) to update
    const matchingFinance = await prisma.financeRecord.findFirst({
      where: {
        OR: [
          { customerPhone: sale.customerPhone.trim() },
          { payments: { some: { notes: { contains: sale.invoiceNo } } } }
        ],
        status: 'ACTIVE'
      }
    });

    const saleDateStr = new Date().toISOString().split('T')[0];

    if (matchingFinance) {
      const newFinPaid = matchingFinance.totalPaid + paymentNum;
      const newFinDue = Math.max(0, matchingFinance.currentBalance - paymentNum);
      const newStatus = newFinDue <= 0 ? 'COMPLETED' : 'ACTIVE';

      await prisma.financeRecord.update({
        where: { id: matchingFinance.id },
        data: {
          totalPaid: newFinPaid,
          currentBalance: newFinDue,
          status: newStatus,
          payments: {
            create: {
              receiptNo: `REC-PAY-${Math.floor(1000 + Math.random() * 9000)}`,
              amount: paymentNum,
              paymentDate: saleDateStr,
              paymentMethod: paymentMethod || 'CASH',
              notes: `Bill Payment Collection (Invoice #${sale.invoiceNo})`
            }
          }
        }
      });

      // Recalculate customer's total outstanding balance
      if (matchingFinance.customerId) {
        const activeRecords = await prisma.financeRecord.findMany({
          where: { customerId: matchingFinance.customerId, status: 'ACTIVE' }
        });
        const totalOut = activeRecords.reduce((sum, r) => sum + r.currentBalance, 0);
        await prisma.customer.update({
          where: { id: matchingFinance.customerId },
          data: { totalOutstanding: totalOut }
        });
      }
    }

    // 2. Create CashBook entry for payment collection
    await prisma.cashBookEntry.create({
      data: {
        type: 'CASH_IN',
        category: 'Invoice Payment Collection',
        amount: paymentNum,
        notes: `Received payment for Invoice #${sale.invoiceNo} from ${sale.customerName} (${paymentMethod || 'CASH'})`,
        date: saleDateStr
      }
    });

    res.json({ success: true, data: updatedSale });
  } catch (error) {
    console.error('Error recording sale payment:', error);
    res.status(500).json({ success: false, error: 'Failed to record payment' });
  }
});

export default router;
