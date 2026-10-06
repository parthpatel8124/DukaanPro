import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { prisma } from './lib/prisma';

import dashboardRouter from './routes/dashboard';
import cashbookRouter from './routes/cashbook';
import financesRouter from './routes/finances';
import salesRouter from './routes/sales';
import directoryRouter from './routes/directory';
import productsRouter from './routes/products';
import storeRouter from './routes/store';
import brandsRouter from './routes/brands';
import categoriesRouter from './routes/categories';
import taxesRouter from './routes/taxes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

let isDbConnected = false;
let dbConnectionError: string | null = null;

// Function to verify PostgreSQL Database Connection at startup
async function checkDatabaseConnection() {
  try {
    await prisma.$connect();
    // Execute a test query to verify PostgreSQL table access
    await prisma.customer.count();
    isDbConnected = true;
    dbConnectionError = null;
    console.log('--------------------------------------------------');
    console.log('🟢 PostgreSQL Database Connected Successfully!');
    console.log('🐘 Target Database: dukaanpro on localhost:5432');
    console.log('--------------------------------------------------');
  } catch (error: any) {
    isDbConnected = false;
    dbConnectionError = error?.message || 'Unknown database connection error';
    console.log('--------------------------------------------------');
    console.log('🔴 PostgreSQL Database Connection Error!');
    console.log('❌ Details:', dbConnectionError);
    console.log('💡 Tip: Ensure PostgreSQL service is running and DATABASE_URL in .env is correct.');
    console.log('--------------------------------------------------');
  }
}

// Health Check API with Live PostgreSQL Status
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'OK',
    service: 'DukaanPro ERP Backend API',
    database: {
      provider: 'PostgreSQL (Prisma ORM)',
      connected: isDbConnected,
      error: dbConnectionError
    },
    timestamp: new Date().toISOString()
  });
});

import authRouter from './routes/auth';
import adminRouter from './routes/admin';

// Mount Module REST Routers
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/cashbook', cashbookRouter);
app.use('/api/finances', financesRouter);
app.use('/api/sales', salesRouter);
app.use('/api/directory', directoryRouter);
app.use('/api/products', productsRouter);
app.use('/api/store', storeRouter);
app.use('/api/brands', brandsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/taxes', taxesRouter);

app.listen(Number(PORT), '0.0.0.0', async () => {
  console.log(`🚀 DukaanPro ERP Backend REST API running on http://0.0.0.0:${PORT}`);
  console.log(`📡 Local Network Access: http://192.168.31.210:${PORT}/api`);
  await checkDatabaseConnection();
});
