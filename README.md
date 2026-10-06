# DukaanPro ERP 🛍️⚡
> **Comprehensive Store Management & Billing ERP System for Electronics & Retail Shops**

DukaanPro ERP is a modern, high-performance web-based Enterprise Resource Planning (ERP) system designed specifically for electronics stores (e.g. Kishan Electronics). It streamlines POS counter billing, inventory & IMEI serialized device tracking, customer udhar (credit/finance) ledgers, daily cash books, supplier registers, and business master data.

---

## 🌟 Key Features

### 📊 1. Live Performance Dashboard
- **Real-Time KPIs**: Today's sales revenue, cash collection, total outstanding finance, pending customers, and low stock count alerts.
- **Revenue & Profit Trends**: Interactive SVG visual trend curves comparing revenue vs. profit margins.
- **Quick Controls**: Instant payment entry, period selection (Today, This Week, This Month, FY), and real-time ledger refreshing.

### 🧾 2. POS Bill Book & Billing
- **Fast Counter Billing**: Real-time product search by name, brand, or model.
- **Serialized (IMEI) Support**: Track unique device IMEIs per sold unit with warranty status.
- **GST & Discount Calculations**: Automatic GST breakdown (CGST/SGST/IGST), subtotal calculations, and customized discounts.
- **Customer Auto-fill**: Quick dropdown search for existing customers or seamless inline creation for new walk-ins.

### 💰 3. Daily Cash Book
- **Counter Cash Management**: Record daily `Cash In` and `Cash Out` entries with custom categories and notes.
- **Net Closing Balance**: Real-time calculation of daily surplus/deficit.
- **Date Navigation**: Shift back and forth between past dates to inspect historical cash ledgers.

### 🤝 4. Personal Finance & Udhar Ledger
- **EMI & Udhar Tracking**: Maintain detailed customer loan records including total price, down payment, interest rate, and remaining principal balance.
- **Repayment Logs**: Log partial/full repayments via UPI, Cash, Card, or Bank transfer.
- **WhatsApp Payment Reminders**: Generate direct payment reminder templates for customers.

### 📦 5. Stock & Inventory Management
- **Dual Layout Views**: Switch between List View and Visual Grid View.
- **IMEI / Serial Unit Manager**: View and manage individual serial numbers per product model.
- **Low Stock Alerts**: Automatic highlight notifications for items falling below minimum stock thresholds.
- **Bulk Import & Manual Entry**: Add products manually or import bulk items via JSON datasets.

### 📁 6. Customers & Suppliers Directory
- **Customer Ledger**: View total purchases, outstanding udhari balance, and phone numbers.
- **Supplier Ledger**: Track vendor details, company GSTIN, contact info, and pending supplier payments.

### ⚙️ 7. Master Data & Shop Setup
- **Brands Register**: Manage brand priorities and logo URLs.
- **Categories Register**: Define categories with tracking modes (`SERIALIZED` vs `QUANTITY`), default HSN codes, and GST rates.
- **Tax Slabs Register**: Custom GST tax structures (0%, 5%, 12%, 18%, 28%).
- **Shop Profile**: Customize invoice header details (Shop Name, GSTIN, Address, Phone, Jurisdiction, Terms & Conditions).

---

## 🚀 Tech Stack

### **Frontend**
- **Framework**: React 18 with Vite
- **Language**: TypeScript
- **Styling**: TailwindCSS & Custom Vanilla CSS Design Tokens
- **Icons**: Lucide React Icons
- **State Management**: Zustand
- **Notifications**: React Hot Toast

### **Backend**
- **Runtime**: Node.js & Express
- **Language**: TypeScript
- **ORM**: Prisma ORM
- **Database**: PostgreSQL
- **Security**: CORS, Helmet, and Environment configuration

---

## 📁 Directory Structure

```
DukaanPro/
├── frontend/               # React + Vite Frontend Application
│   ├── src/
│   │   ├── components/     # Reusable UI Components (Header, Sidebar, Modals)
│   │   ├── pages/          # Main Module Views (Dashboard, BillBook, Products, etc.)
│   │   ├── services/       # API Integration Layer
│   │   └── store/          # Zustand State Management
│   └── package.json
│
├── backend/                # Node.js + Express + Prisma REST API
│   ├── prisma/
│   │   └── schema.prisma   # PostgreSQL Database Models
│   ├── src/
│   │   ├── routes/         # API Endpoint Controllers
│   │   └── lib/            # Prisma Client Instance
│   └── package.json
│
└── README.md
```

---

## ⚙️ Getting Started & Setup

### Prerequisites
- **Node.js**: v18+ installed
- **PostgreSQL**: Running instance with a created database (e.g., `dukaanpro`)

---

### 1️⃣ Backend Setup

```bash
# Navigate to backend folder
cd backend

# Install dependencies
npm install

# Configure Environment Variables
# Create a .env file inside backend/ directory:
# DATABASE_URL="postgresql://postgres:password@localhost:5432/dukaanpro?schema=public"
# PORT=5000

# Push Prisma Database Schema
npx prisma db push

# Start Backend Development Server
npm run dev
```
The API server will run on `http://localhost:5000/api`.

---

### 2️⃣ Frontend Setup

```bash
# Navigate to frontend folder (from root)
cd frontend

# Install dependencies
npm install

# Start Frontend Development Server
npm run dev
```
The Web App will launch on `http://localhost:5173`.

---

## 📝 License
This project is proprietary software for store management operations.
