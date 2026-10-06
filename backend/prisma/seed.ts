/// <reference types="node" />
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding DukaanPro database...');

  // 1. Seed Customer
  const cust1 = await prisma.customer.upsert({
    where: { mobileNumber: '9876543210' },
    update: {},
    create: {
      fullName: 'Ramesh Sharma',
      mobileNumber: '9876543210',
      address: 'Shop #4, Karol Bagh',
      city: 'Delhi',
      state: 'Delhi',
      totalOutstanding: 42700
    }
  });

  const cust2 = await prisma.customer.upsert({
    where: { mobileNumber: '9811223344' },
    update: {},
    create: {
      fullName: 'Vikram Singh',
      mobileNumber: '9811223344',
      address: 'Block B, Laxmi Nagar',
      city: 'Delhi',
      state: 'Delhi',
      totalOutstanding: 18500
    }
  });

  // 2. Seed Personal Finance Record
  const fin1Count = await prisma.financeRecord.count();
  if (fin1Count === 0) {
    await prisma.financeRecord.create({
      data: {
        customerId: cust1.id,
        customerName: cust1.fullName,
        customerPhone: cust1.mobileNumber,
        productDetails: 'iPhone 15 Pro Max 256GB Titanium Gray',
        purchaseDate: '2026-07-01',
        totalProductPrice: 144900,
        downPayment: 44900,
        principalRemaining: 100000,
        interestRateMonthly: 1.5,
        totalPaid: 102200,
        currentBalance: 42700,
        status: 'ACTIVE',
        payments: {
          create: [
            {
              receiptNo: 'REC-1001',
              amount: 44900,
              paymentDate: '2026-07-01',
              paymentMethod: 'UPI',
              notes: 'Initial Down Payment'
            },
            {
              receiptNo: 'REC-1002',
              amount: 32300,
              paymentDate: '2026-07-10',
              paymentMethod: 'CASH',
              notes: 'Partial Udhar Payment'
            },
            {
              receiptNo: 'REC-1003',
              amount: 25000,
              paymentDate: '2026-07-18',
              paymentMethod: 'UPI',
              notes: 'Partial Udhar Payment'
            }
          ]
        }
      }
    });

    await prisma.financeRecord.create({
      data: {
        customerId: cust2.id,
        customerName: cust2.fullName,
        customerPhone: cust2.mobileNumber,
        productDetails: 'Samsung Galaxy S24 Ultra 512GB',
        purchaseDate: '2026-07-05',
        totalProductPrice: 129999,
        downPayment: 29999,
        principalRemaining: 100000,
        interestRateMonthly: 1.5,
        totalPaid: 111499,
        currentBalance: 18500,
        status: 'ACTIVE',
        payments: {
          create: [
            {
              receiptNo: 'REC-1004',
              amount: 29999,
              paymentDate: '2026-07-05',
              paymentMethod: 'CARD',
              notes: 'Down Payment'
            }
          ]
        }
      }
    });
  }

  // 3. Seed CashBook Entries
  const cashCount = await prisma.cashBookEntry.count();
  if (cashCount === 0) {
    await prisma.cashBookEntry.createMany({
      data: [
        {
          type: 'CASH_IN',
          category: 'Counter Sales',
          amount: 48500,
          notes: 'Daily counter phone sales',
          date: '2026-07-21'
        },
        {
          type: 'CASH_IN',
          category: 'Udhar EMI Collection',
          amount: 25000,
          notes: 'Cash received from Ramesh Sharma',
          date: '2026-07-21'
        },
        {
          type: 'CASH_OUT',
          category: 'Store Rent',
          amount: 11500,
          notes: 'Monthly Karol Bagh shop rent advance',
          date: '2026-07-21'
        }
      ]
    });
  }

  // 4. Seed Bill Book (Sales)
  const salesCount = await prisma.sale.count();
  if (salesCount === 0) {
    await prisma.sale.create({
      data: {
        invoiceNo: 'INV-2026-001',
        customerId: cust1.id,
        customerName: cust1.fullName,
        customerPhone: cust1.mobileNumber,
        subTotal: 122796,
        gstTotal: 22104,
        grandTotal: 144900,
        paymentMethod: 'UPI',
        saleDate: '2026-07-21',
        isGstInvoice: true,
        items: {
          create: [
            {
              productName: 'iPhone 15 Pro Max 256GB',
              quantity: 1,
              unitPrice: 144900,
              gstRate: 18,
              total: 144900,
              imei: '358912345678901'
            }
          ]
        }
      }
    });
  }

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
