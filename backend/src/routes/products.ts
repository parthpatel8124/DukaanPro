import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /api/products - List all products & inventory stock
router.get('/', async (_req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      include: { devices: true }
    });
    res.json({ success: true, data: products });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
});

// GET /api/products/:id - Get single product details
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const product = await prisma.product.findUnique({ 
      where: { id },
      include: { devices: true }
    });
    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }
    res.json({ success: true, data: product });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch product details' });
  }
});

// POST /api/products - Create new Product / Item (Phones, Accessories, Cables, Chargers)
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      name,
      brand,
      category,
      isMobile,
      trackingType,
      sku,
      hsnCode,
      gstRate,
      purchasePrice,
      sellingPrice,
      stockQuantity,
      minStockAlert,
      warrantyMonths,
      storage,
      color,
      imei,
      supplierName,
      imageUrl,
      devices // Array of unit objects for serialized products
    } = req.body;

    if (!name || !brand || sellingPrice === undefined || sellingPrice === null) {
      res.status(400).json({ success: false, error: 'Item name, brand, and selling price are required' });
      return;
    }

    const resolvedTrackingType = trackingType ? String(trackingType).trim() : (isMobile ? 'SERIALIZED' : 'QUANTITY');
    const isSerialized = resolvedTrackingType === 'SERIALIZED' || Boolean(isMobile);

    let qtyNum = parseInt(stockQuantity || '0', 10);
    
    // For serialized products, if devices array is provided, compute stock strictly from available units
    if (isSerialized && Array.isArray(devices)) {
      qtyNum = devices.filter(d => (d.status || 'AVAILABLE') === 'AVAILABLE').length;
    }

    const minAlertNum = parseInt(minStockAlert || '5', 10);
    const status = qtyNum <= 0 ? 'OUT_OF_STOCK' : qtyNum <= minAlertNum ? 'LOW_STOCK' : 'IN_STOCK';

    // Unique SKU Generation logic to prevent database unique constraint collisions
    let generatedSku = sku ? String(sku).trim() : `SKU-${Date.now().toString().slice(-6)}`;
    const existingSku = await prisma.product.findUnique({ where: { sku: generatedSku } });
    if (existingSku) {
      generatedSku = `${generatedSku}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    }

    const newProduct = await prisma.product.create({
      data: {
        name: String(name).trim(),
        brand: String(brand).trim(),
        category: category ? String(category).trim() : (isSerialized ? 'Mobile' : 'Accessories'),
        isMobile: isSerialized,
        trackingType: resolvedTrackingType,
        sku: generatedSku,
        hsnCode: hsnCode ? String(hsnCode).trim() : '8517',
        gstRate: parseFloat(gstRate || '18'),
        purchasePrice: parseFloat(purchasePrice || '0'),
        sellingPrice: parseFloat(sellingPrice || '0'),
        stockQuantity: qtyNum,
        minStockAlert: minAlertNum,
        warrantyMonths: parseInt(warrantyMonths || '12', 10),
        storage: storage ? String(storage).trim() : null,
        color: color ? String(color).trim() : null,
        imei: imei ? String(imei).trim() : null,
        supplierName: supplierName ? String(supplierName).trim() : null,
        imageUrl: imageUrl ? String(imageUrl).trim() : null,
        status,
        devices: (isSerialized && Array.isArray(devices) && devices.length > 0) ? {
          create: devices.map(d => ({
            imei1: d.imei1 || d.serialNumber,
            imei2: d.imei2 || null,
            color: d.color || null,
            ram: d.ram || null,
            storage: d.storage || d.specs || null,
            imageUrl: d.imageUrl || null,
            purchasePrice: d.purchasePrice ? parseFloat(d.purchasePrice) : parseFloat(purchasePrice || '0'),
            sellingPrice: d.sellingPrice ? parseFloat(d.sellingPrice) : parseFloat(sellingPrice || '0'),
            supplierName: d.supplierName || (supplierName ? String(supplierName).trim() : null),
            purchaseDate: d.purchaseDate || new Date().toISOString(),
            warrantyExpiry: d.warrantyExpiry || null,
            barcode: d.barcode || null,
            status: d.status || 'AVAILABLE'
          }))
        } : undefined
      },
      include: { devices: true }
    });

    res.status(201).json({ success: true, data: newProduct });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ success: false, error: 'Failed to create product item' });
  }
});

// PUT /api/products/:id - Full Product / Item Edit
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const {
      name,
      brand,
      category,
      isMobile,
      trackingType,
      hsnCode,
      gstRate,
      purchasePrice,
      sellingPrice,
      stockQuantity,
      minStockAlert,
      warrantyMonths,
      storage,
      color,
      imei,
      supplierName,
      imageUrl,
      devices
    } = req.body;

    const existingProduct: any = await prisma.product.findUnique({ where: { id } });
    if (!existingProduct) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    const resolvedTrackingType = trackingType !== undefined ? String(trackingType).trim() : (existingProduct.trackingType || (existingProduct.isMobile ? 'SERIALIZED' : 'QUANTITY'));
    const isSerialized = resolvedTrackingType === 'SERIALIZED' || existingProduct.isMobile;

    let qtyNum = stockQuantity !== undefined ? parseInt(stockQuantity, 10) : existingProduct.stockQuantity;
    
    if (isSerialized && Array.isArray(devices)) {
      qtyNum = devices.filter(d => (d.status || 'AVAILABLE') === 'AVAILABLE').length;
    }

    const minAlertNum = minStockAlert !== undefined ? parseInt(minStockAlert, 10) : existingProduct.minStockAlert;
    const status = qtyNum <= 0 ? 'OUT_OF_STOCK' : qtyNum <= minAlertNum ? 'LOW_STOCK' : 'IN_STOCK';

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        name: name !== undefined ? String(name).trim() : existingProduct.name,
        brand: brand !== undefined ? String(brand).trim() : existingProduct.brand,
        category: category !== undefined ? String(category).trim() : existingProduct.category,
        isMobile: isSerialized,
        trackingType: resolvedTrackingType,
        hsnCode: hsnCode !== undefined ? String(hsnCode).trim() : existingProduct.hsnCode,
        gstRate: gstRate !== undefined ? parseFloat(gstRate) : existingProduct.gstRate,
        purchasePrice: purchasePrice !== undefined ? parseFloat(purchasePrice) : existingProduct.purchasePrice,
        sellingPrice: sellingPrice !== undefined ? parseFloat(sellingPrice) : existingProduct.sellingPrice,
        stockQuantity: qtyNum,
        minStockAlert: minAlertNum,
        warrantyMonths: warrantyMonths !== undefined ? parseInt(warrantyMonths, 10) : existingProduct.warrantyMonths,
        storage: storage !== undefined ? (storage ? String(storage).trim() : null) : existingProduct.storage,
        color: color !== undefined ? (color ? String(color).trim() : null) : existingProduct.color,
        imei: imei !== undefined ? (imei ? String(imei).trim() : null) : existingProduct.imei,
        supplierName: supplierName !== undefined ? (supplierName ? String(supplierName).trim() : null) : existingProduct.supplierName,
        imageUrl: imageUrl !== undefined ? (imageUrl ? String(imageUrl).trim() : null) : existingProduct.imageUrl,
        status,
        devices: (isSerialized && Array.isArray(devices)) ? {
          deleteMany: { id: { notIn: devices.filter(d => d.id).map(d => d.id) } },
          upsert: devices.map(d => ({
            where: { id: d.id || 'new-id' },
            update: {
              imei1: d.imei1 || d.serialNumber,
              imei2: d.imei2 || null,
              color: d.color || null,
              ram: d.ram || null,
              storage: d.storage || d.specs || null,
              imageUrl: d.imageUrl || null,
              purchasePrice: d.purchasePrice ? parseFloat(d.purchasePrice) : null,
              sellingPrice: d.sellingPrice ? parseFloat(d.sellingPrice) : null,
              status: d.status || 'AVAILABLE'
            },
            create: {
              imei1: d.imei1 || d.serialNumber,
              imei2: d.imei2 || null,
              color: d.color || null,
              ram: d.ram || null,
              storage: d.storage || d.specs || null,
              imageUrl: d.imageUrl || null,
              purchasePrice: d.purchasePrice ? parseFloat(d.purchasePrice) : (purchasePrice ? parseFloat(purchasePrice) : existingProduct.purchasePrice),
              sellingPrice: d.sellingPrice ? parseFloat(d.sellingPrice) : (sellingPrice ? parseFloat(sellingPrice) : existingProduct.sellingPrice),
              status: d.status || 'AVAILABLE'
            }
          }))
        } : undefined
      },
      include: { devices: true }
    });

    res.json({ success: true, data: updatedProduct });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ success: false, error: 'Failed to update product details' });
  }
});

// PUT /api/products/:id/stock - Quick adjust stock quantity
router.put('/:id/stock', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { adjustment } = req.body; // e.g. +5 or -1

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    const newQty = Math.max(0, product.stockQuantity + parseInt(adjustment || '0', 10));
    const status = newQty <= 0 ? 'OUT_OF_STOCK' : newQty <= product.minStockAlert ? 'LOW_STOCK' : 'IN_STOCK';

    const updated = await prisma.product.update({
      where: { id },
      data: {
        stockQuantity: newQty,
        status
      }
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error adjusting stock:', error);
    res.status(500).json({ success: false, error: 'Failed to adjust stock quantity' });
  }
});

// DELETE /api/products/:id - Delete product item
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    await prisma.product.delete({ where: { id } });
    res.json({ success: true, message: 'Product item deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ success: false, error: 'Failed to delete product item' });
  }
});

// POST /api/products/import - Bulk import products & device units from CSV
router.post('/import', async (req: Request, res: Response) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, error: 'No items provided for import' });
      return;
    }

    let importedProductsCount = 0;
    let importedDevicesCount = 0;

    // Group incoming items by unique key: brand + name
    const groupedMap = new Map<string, any[]>();
    for (const rawItem of items) {
      const brandStr = String(rawItem.brand || 'Generic').trim();
      const nameStr = String(rawItem.name || rawItem.modelName || rawItem.itemName || 'Item').trim();
      const groupKey = `${brandStr.toLowerCase()}___${nameStr.toLowerCase()}`;
      if (!groupedMap.has(groupKey)) {
        groupedMap.set(groupKey, []);
      }
      groupedMap.get(groupKey)!.push({
        ...rawItem,
        brand: brandStr,
        name: nameStr
      });
    }

    for (const [_, rowList] of groupedMap.entries()) {
      const firstRow = rowList[0];
      const trackingType = String(firstRow.trackingType || '').toUpperCase() === 'QUANTITY' ? 'QUANTITY' : 'SERIALIZED';
      const isSerialized = trackingType === 'SERIALIZED';

      const existingProd = await prisma.product.findFirst({
        where: {
          brand: { equals: firstRow.brand, mode: 'insensitive' },
          name: { equals: firstRow.name, mode: 'insensitive' }
        },
        include: { devices: true }
      });

      if (isSerialized) {
        // Collect all physical devices from rowList that have at least imei1 or serial
        const deviceCreates: any[] = [];
        for (const row of rowList) {
          const imei1Val = row.imei1 || row.imei || row.serialNumber;
          if (imei1Val) {
            deviceCreates.push({
              imei1: String(imei1Val).trim(),
              imei2: row.imei2 ? String(row.imei2).trim() : null,
              color: row.color ? String(row.color).trim() : (firstRow.color || null),
              ram: row.ram ? String(row.ram).trim() : (firstRow.ram || null),
              storage: row.storage ? String(row.storage).trim() : (firstRow.storage || null),
              purchasePrice: parseFloat(row.purchasePrice || firstRow.purchasePrice || '0'),
              sellingPrice: parseFloat(row.sellingPrice || firstRow.sellingPrice || '0'),
              supplierName: row.supplierName ? String(row.supplierName).trim() : (firstRow.supplierName || null),
              status: 'AVAILABLE'
            });
            importedDevicesCount++;
          }
        }

        if (existingProd) {
          // Add new device units & update stock count
          if (deviceCreates.length > 0) {
            await prisma.product.update({
              where: { id: existingProd.id },
              data: {
                stockQuantity: existingProd.stockQuantity + deviceCreates.length,
                status: 'IN_STOCK',
                devices: {
                  create: deviceCreates
                }
              }
            });
          }
        } else {
          // Create brand-new serialized Product with devices
          const generatedSku = `SKU-SER-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
          const qty = deviceCreates.length > 0 ? deviceCreates.length : parseInt(firstRow.stockQuantity || '1', 10);
          await prisma.product.create({
            data: {
              name: firstRow.name,
              brand: firstRow.brand,
              category: firstRow.category ? String(firstRow.category).trim() : 'Smartphones',
              isMobile: true,
              trackingType: 'SERIALIZED',
              sku: generatedSku,
              hsnCode: firstRow.hsnCode ? String(firstRow.hsnCode).trim() : '8517',
              gstRate: parseFloat(firstRow.gstRate || '18'),
              purchasePrice: parseFloat(firstRow.purchasePrice || '0'),
              sellingPrice: parseFloat(firstRow.sellingPrice || '0'),
              stockQuantity: qty,
              minStockAlert: parseInt(firstRow.minStockAlert || '5', 10),
              warrantyMonths: parseInt(firstRow.warrantyMonths || '12', 10),
              storage: firstRow.storage ? String(firstRow.storage).trim() : null,
              color: firstRow.color ? String(firstRow.color).trim() : null,
              supplierName: firstRow.supplierName ? String(firstRow.supplierName).trim() : null,
              status: qty <= 0 ? 'OUT_OF_STOCK' : 'IN_STOCK',
              devices: deviceCreates.length > 0 ? { create: deviceCreates } : undefined
            }
          });
          importedProductsCount++;
        }
      } else {
        // Bulk Quantity Product
        const addQty = parseInt(firstRow.stockQuantity || '1', 10);
        if (existingProd) {
          const newQty = existingProd.stockQuantity + addQty;
          await prisma.product.update({
            where: { id: existingProd.id },
            data: {
              stockQuantity: newQty,
              status: newQty <= 0 ? 'OUT_OF_STOCK' : 'IN_STOCK'
            }
          });
        } else {
          const generatedSku = `SKU-QTY-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
          await prisma.product.create({
            data: {
              name: firstRow.name,
              brand: firstRow.brand,
              category: firstRow.category ? String(firstRow.category).trim() : 'Accessories',
              isMobile: false,
              trackingType: 'QUANTITY',
              sku: generatedSku,
              hsnCode: firstRow.hsnCode ? String(firstRow.hsnCode).trim() : '8517',
              gstRate: parseFloat(firstRow.gstRate || '18'),
              purchasePrice: parseFloat(firstRow.purchasePrice || '0'),
              sellingPrice: parseFloat(firstRow.sellingPrice || '0'),
              stockQuantity: addQty,
              minStockAlert: parseInt(firstRow.minStockAlert || '5', 10),
              warrantyMonths: parseInt(firstRow.warrantyMonths || '6', 10),
              supplierName: firstRow.supplierName ? String(firstRow.supplierName).trim() : null,
              status: addQty <= 0 ? 'OUT_OF_STOCK' : 'IN_STOCK'
            }
          });
          importedProductsCount++;
        }
      }
    }

    res.status(201).json({
      success: true,
      message: `Imported ${importedProductsCount} product model(s) and ${importedDevicesCount} device unit(s).`,
      importedProductsCount,
      importedDevicesCount
    });
  } catch (error) {
    console.error('Error importing products:', error);
    res.status(500).json({ success: false, error: 'Failed to process CSV import' });
  }
});

export default router;
