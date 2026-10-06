const getApiBaseUrl = (): string => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  const hostname = (typeof window !== 'undefined' && window.location.hostname) ? window.location.hostname : 'localhost';
  return `http://${hostname}:5000/api`;
};

export const BASE_URL = getApiBaseUrl();

export interface DashboardStatsAPI {
  todaysSales: number;
  salesGrowth: string;
  todaysCollection: number;
  collectionGrowth: string;
  outstandingFinance: number;
  pendingCustomersCount: number;
  lowStockCount: number;
  cashInHand: number;
  bankBalance: number;
}

export interface RevenueTrendAPI {
  day: string;
  revenue: number;
  profit: number;
}

export interface ActivityItemAPI {
  id: string;
  time: string;
  user: string;
  action: string;
  details: string;
}

// 1. Dashboard APIs
export const fetchDashboardStats = async (period?: string, date?: string): Promise<DashboardStatsAPI> => {
  try {
    const params = new URLSearchParams();
    if (period) params.append('period', period);
    if (date) params.append('date', date);
    const queryString = params.toString() ? `?${params.toString()}` : '';

    const res = await fetch(`${BASE_URL}/dashboard/stats${queryString}`);
    const json = await res.json();
    if (json.success && json.data) return json.data;
  } catch (err) {
    console.warn('Backend API connection warning:', err);
  }
  return {
    todaysSales: 0,
    salesGrowth: '0%',
    todaysCollection: 0,
    collectionGrowth: '0%',
    outstandingFinance: 0,
    pendingCustomersCount: 0,
    lowStockCount: 0,
    cashInHand: 0,
    bankBalance: 0
  };
};

export const fetchRevenueTrend = async (period?: string, date?: string): Promise<RevenueTrendAPI[]> => {
  try {
    const params = new URLSearchParams();
    if (period) params.append('period', period);
    if (date) params.append('date', date);
    const queryString = params.toString() ? `?${params.toString()}` : '';

    const res = await fetch(`${BASE_URL}/dashboard/revenue-trend${queryString}`);
    const json = await res.json();
    if (json.success && json.data) return json.data;
  } catch (err) {
    console.warn('Backend API connection warning:', err);
  }
  return [
    { day: 'Mon', revenue: 0, profit: 0 },
    { day: 'Tue', revenue: 0, profit: 0 },
    { day: 'Wed', revenue: 0, profit: 0 },
    { day: 'Thu', revenue: 0, profit: 0 },
    { day: 'Fri', revenue: 0, profit: 0 },
    { day: 'Sat', revenue: 0, profit: 0 },
    { day: 'Sun', revenue: 0, profit: 0 }
  ];
};

export const fetchRecentActivities = async (): Promise<ActivityItemAPI[]> => {
  try {
    const res = await fetch(`${BASE_URL}/dashboard/recent-activities`);
    const json = await res.json();
    if (json.success && json.data) return json.data;
  } catch (err) {
    console.warn('Backend API connection warning:', err);
  }
  return [];
};

// 2. Daily Log Book (CashBook) APIs
export const fetchCashBookEntries = async (targetDate?: string) => {
  try {
    const url = targetDate ? `${BASE_URL}/cashbook?date=${targetDate}` : `${BASE_URL}/cashbook`;
    const res = await fetch(url);
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) return json.data;
  } catch (err) {
    console.warn('Backend API connection warning:', err);
  }
  return [];
};

export const createCashBookEntry = async (data: {
  type: 'CASH_IN' | 'CASH_OUT';
  category: string;
  amount: number;
  notes?: string;
  date?: string;
}) => {
  try {
    const res = await fetch(`${BASE_URL}/cashbook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (json.success) return json.data;
  } catch (err) {
    console.warn('Backend API error:', err);
  }
  return null;
};

// 3. Personal Finance EMI Log Book APIs
export const fetchFinanceAccounts = async () => {
  try {
    const res = await fetch(`${BASE_URL}/finances`);
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) return json.data;
  } catch (err) {
    console.warn('Backend API connection warning:', err);
  }
  return [];
};

export const recordFinancePayment = async (data: any) => {
  try {
    const res = await fetch(`${BASE_URL}/finances/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (json.success) return json.data;
  } catch (err) {
    console.warn('Backend API error:', err);
  }
  return null;
};

export const recordFinanceRepayment = async (id: string, data: any) => {
  return recordFinancePayment({ financeId: id, ...data });
};

export const createFinanceAccount = async (data: any) => {
  try {
    const res = await fetch(`${BASE_URL}/finances/new`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (json.success) return json.data;
  } catch (err) {
    console.warn('Backend API error:', err);
  }
  return null;
};

// 4. Bill Book (Sales POS) APIs
export const fetchBillBookInvoices = async () => {
  try {
    const res = await fetch(`${BASE_URL}/sales`);
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) return json.data;
  } catch (err) {
    console.warn('Backend API connection warning:', err);
  }
  return [];
};

export const createBillBookInvoice = async (data: any) => {
  try {
    const res = await fetch(`${BASE_URL}/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (json.success) return json.data;
  } catch (err) {
    console.warn('Backend API error:', err);
  }
  return null;
};

export const createSalesInvoice = createBillBookInvoice;

export const recordSalePayment = async (saleId: string, data: { amount: number; paymentMethod: string }) => {
  try {
    const res = await fetch(`${BASE_URL}/sales/${saleId}/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (json.success) return json.data;
  } catch (err) {
    console.warn('Backend API error:', err);
  }
  return null;
};

// 5. Customers & Suppliers Directory APIs
export const fetchDirectoryCustomers = async () => {
  try {
    const res = await fetch(`${BASE_URL}/directory/customers`);
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) return json.data;
  } catch (err) {
    console.warn('Backend API connection warning:', err);
  }
  return [];
};

export const fetchCustomersList = fetchDirectoryCustomers;

export const createDirectoryCustomer = async (data: any) => {
  try {
    const res = await fetch(`${BASE_URL}/directory/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (json.success) return json.data;
  } catch (err) {
    console.warn('Backend API error:', err);
  }
  return null;
};

export const createCustomerProfile = createDirectoryCustomer;

export const fetchDirectorySuppliers = async () => {
  try {
    const res = await fetch(`${BASE_URL}/directory/suppliers`);
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) return json.data;
  } catch (err) {
    console.warn('Backend API connection warning:', err);
  }
  return [];
};

export const fetchSuppliersList = fetchDirectorySuppliers;

export const createDirectorySupplier = async (data: any) => {
  try {
    const res = await fetch(`${BASE_URL}/directory/suppliers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (json.success) return json.data;
  } catch (err) {
    console.warn('Backend API error:', err);
  }
  return null;
};

export const createSupplierProfile = createDirectorySupplier;

export const recordCustomerPayment = async (id: string, amount: number, paymentMode: string) => {
  try {
    const res = await fetch(`${BASE_URL}/directory/customers/${id}/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, paymentMode })
    });
    const json = await res.json();
    if (json.success) return json.data;
  } catch (err) {
    console.warn('Backend API error:', err);
  }
  return null;
};

export const recordSupplierPayment = async (id: string, amount: number, paymentMode: string) => {
  try {
    const res = await fetch(`${BASE_URL}/directory/suppliers/${id}/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, paymentMode })
    });
    const json = await res.json();
    if (json.success) return json.data;
  } catch (err) {
    console.warn('Backend API error:', err);
  }
  return null;
};

// 6. Products & Inventory APIs (Smartphones, Cables, Chargers, Power Banks, Earbuds)
export const fetchProductsList = async () => {
  try {
    const res = await fetch(`${BASE_URL}/products`);
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) return json.data;
  } catch (err) {
    console.warn('Backend API connection warning:', err);
  }
  return [];
};

export const createProductItem = async (data: any) => {
  try {
    const res = await fetch(`${BASE_URL}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (json.success) return json.data;
  } catch (err) {
    console.warn('Backend API error:', err);
  }
  return null;
};

export const adjustProductStock = async (id: string, adjustment: number) => {
  try {
    const res = await fetch(`${BASE_URL}/products/${id}/stock`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adjustment })
    });
    const json = await res.json();
    if (json.success) return json.data;
  } catch (err) {
    console.warn('Backend API error:', err);
  }
  return null;
};

export const updateProductItem = async (id: string, data: any) => {
  try {
    const res = await fetch(`${BASE_URL}/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (json.success) return json.data;
  } catch (err) {
    console.warn('Backend API error:', err);
  }
  return null;
};

export const deleteProductItem = async (id: string) => {
  try {
    const res = await fetch(`${BASE_URL}/products/${id}`, {
      method: 'DELETE'
    });
    const json = await res.json();
    if (json.success) return true;
  } catch (err) {
    console.warn('Backend API error:', err);
  }
  return false;
};

export const importProductsBulk = async (items: any[]) => {
  try {
    const res = await fetch(`${BASE_URL}/products/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    });
    const json = await res.json();
    return json;
  } catch (err) {
    console.warn('Backend API error during bulk import:', err);
    return { success: false, error: 'Network error processing bulk import' };
  }
};

// 7. Shop Business Profile APIs
export const fetchStoreProfile = async () => {
  try {
    const res = await fetch(`${BASE_URL}/store`);
    const json = await res.json();
    if (json.success && json.data) return json.data;
  } catch (err) {
    console.warn('Backend API connection warning:', err);
  }
  return {
    name: 'KISHAN',
    tagline: 'ELECTRONICS',
    gstin: '24AUJPP7785L1ZR',
    phone: '99741 27474',
    address: 'Bazar Street, At. & Po. VALOD, Dist. Tapi, Pin - 394 640',
    city: 'VALOD',
    district: 'Tapi',
    state: 'Gujarat',
    pincode: '394640',
    jurisdiction: 'VALOD',
    terms: 'Goods once sold will not be taken back or exchanged. Guarantee/Warranty by Company.'
  };
};

export const updateStoreProfile = async (data: any) => {
  try {
    const res = await fetch(`${BASE_URL}/store`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (json.success) return json.data;
  } catch (err) {
    console.warn('Backend API error:', err);
  }
  return null;
};

// 8. Brand Master APIs
export const fetchBrandsList = async () => {
  try {
    const res = await fetch(`${BASE_URL}/brands`);
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) return json.data;
  } catch (err) {
    console.warn('Backend API connection warning:', err);
  }
  return [];
};

export const createBrand = async (data: { name: string; logoUrl?: string; sortOrder?: number; isActive?: boolean }) => {
  try {
    const res = await fetch(`${BASE_URL}/brands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (json.success) return json.data;
  } catch (err) {
    console.warn('Backend API error:', err);
  }
  return null;
};

export const updateBrand = async (id: string, data: { name?: string; logoUrl?: string; sortOrder?: number; isActive?: boolean }) => {
  try {
    const res = await fetch(`${BASE_URL}/brands/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (json.success) return json.data;
  } catch (err) {
    console.warn('Backend API error:', err);
  }
  return null;
};

export const deleteBrand = async (id: string) => {
  try {
    const res = await fetch(`${BASE_URL}/brands/${id}`, {
      method: 'DELETE'
    });
    const json = await res.json();
    if (json.success) return true;
  } catch (err) {
    console.warn('Backend API error:', err);
  }
  return false;
};

// 9. Category Master APIs
export const fetchCategoriesList = async () => {
  try {
    const res = await fetch(`${BASE_URL}/categories`);
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) return json.data;
  } catch (err) {
    console.warn('Backend API connection warning:', err);
  }
  return [];
};

export const createCategory = async (data: { name: string; iconName?: string; description?: string; hsnCode?: string; gstRate?: number; trackingType?: string; sortOrder?: number; isActive?: boolean }) => {
  try {
    const res = await fetch(`${BASE_URL}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (json.success) return json.data;
  } catch (err) {
    console.warn('Backend API error:', err);
  }
  return null;
};

export const updateCategory = async (id: string, data: any) => {
  try {
    const res = await fetch(`${BASE_URL}/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (json.success) return json.data;
  } catch (err) {
    console.warn('Backend API error:', err);
  }
  return null;
};

export const deleteCategory = async (id: string) => {
  try {
    const res = await fetch(`${BASE_URL}/categories/${id}`, {
      method: 'DELETE'
    });
    const json = await res.json();
    if (json.success) return true;
  } catch (err) {
    console.warn('Backend API error:', err);
  }
  return false;
};

// 10. System Tax Slab & HSN Master APIs
export const fetchTaxSlabsList = async () => {
  try {
    const res = await fetch(`${BASE_URL}/taxes`);
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) return json.data;
  } catch (err) {
    console.warn('Backend API connection warning:', err);
  }
  return [];
};

export const createTaxSlab = async (data: { name: string; gstRate: number; cgstRate?: number; sgstRate?: number; hsnCode?: string; description?: string; isDefault?: boolean }) => {
  try {
    const res = await fetch(`${BASE_URL}/taxes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (json.success) return json.data;
  } catch (err) {
    console.warn('Backend API error:', err);
  }
  return null;
};

export const updateTaxSlab = async (id: string, data: any) => {
  try {
    const res = await fetch(`${BASE_URL}/taxes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (json.success) return json.data;
  } catch (err) {
    console.warn('Backend API error:', err);
  }
  return null;
};

export const deleteTaxSlab = async (id: string) => {
  try {
    const res = await fetch(`${BASE_URL}/taxes/${id}`, {
      method: 'DELETE'
    });
    const json = await res.json();
    if (json.success) return true;
  } catch (err) {
    console.warn('Backend API error:', err);
  }
  return false;
};

// 12. Authentication & Admin APIs
export const getAuthHeaders = (): Record<string, string> => {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('dukaanpro_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export const registerShopAccount = async (data: any) => {
  const res = await fetch(`${BASE_URL}/auth/register-shop`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return await res.json();
};

export const loginUserAccount = async (credentials: any) => {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });
  return await res.json();
};

export const googleAuthAccount = async (data: any) => {
  const res = await fetch(`${BASE_URL}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return await res.json();
};

export const requestForgotPassword = async (email: string) => {
  const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  return await res.json();
};

export const resetPasswordConfirm = async (data: any) => {
  const res = await fetch(`${BASE_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return await res.json();
};

export const fetchCurrentUserSession = async () => {
  try {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: getAuthHeaders()
    });
    return await res.json();
  } catch (err) {
    return { success: false };
  }
};

export const fetchAdminMetrics = async () => {
  try {
    const res = await fetch(`${BASE_URL}/admin/metrics`, {
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (json.success) return json.data;
  } catch (err) {
    console.warn('Admin metrics connection warning:', err);
  }
  return null;
};

export const fetchAdminShops = async () => {
  try {
    const res = await fetch(`${BASE_URL}/admin/shops`, {
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (json.success) return json.data;
  } catch (err) {
    console.warn('Admin shops connection warning:', err);
  }
  return [];
};

export const toggleShopStatusAPI = async (shopId: string, status: 'ACTIVE' | 'SUSPENDED') => {
  try {
    const res = await fetch(`${BASE_URL}/admin/shops/${shopId}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status })
    });
    const json = await res.json();
    return json.success;
  } catch (err) {
    console.warn('Toggle shop status error:', err);
  }
  return false;
};

export const changePasswordAPI = async (data: { currentPassword: string; newPassword: string }) => {
  try {
    const res = await fetch(`${BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: 'Failed to update password. Please check your connection.' };
  }
};

export const updateUserProfileAPI = async (data: { fullName: string; email: string; phone?: string }) => {
  try {
    const res = await fetch(`${BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: 'Failed to update profile. Please check your connection.' };
  }
};
