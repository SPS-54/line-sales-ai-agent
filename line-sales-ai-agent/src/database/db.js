import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const storesFilePath = fs.existsSync(path.join(__dirname, 'stores.json'))
  ? path.join(__dirname, 'stores.json')
  : path.join(__dirname, 'initialStores.json');
const productsFilePath = fs.existsSync(path.join(__dirname, 'products.json'))
  ? path.join(__dirname, 'products.json')
  : path.join(__dirname, 'initialProducts.json');
const whitelistFilePath = path.join(__dirname, 'whitelist.json');

export function cleanStoreName(name) {
  if (!name) return '';
  return String(name).replace(/^ร้าน\s*/, '').trim();
}

export function parseCalendarYearMonth(dateInput) {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1;

  if (!dateInput) {
    return { year, month, formatted: now.toLocaleDateString('th-TH') };
  }

  const str = String(dateInput).trim();

  const isoMatch = str.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    year = parseInt(isoMatch[1]);
    month = parseInt(isoMatch[2]);
    return { year, month, formatted: str };
  }

  const buddhistYearMatch = str.match(/25(\d{2})/);
  if (buddhistYearMatch) {
    year = 2000 + parseInt(buddhistYearMatch[1]);
  } else {
    const yearMatch = str.match(/20(\d{2})/);
    if (yearMatch) year = 2000 + parseInt(yearMatch[1]);
  }

  const monthMap = {
    'ม.ค.': 1, 'มกรา': 1, 'มกราคม': 1,
    'ก.พ.': 2, 'กุมภา': 2, 'กุมภาพันธ์': 2,
    'มี.ค.': 3, 'มีนา': 3, 'มีนาคม': 3,
    'เม.ย.': 4, 'เมษา': 4, 'เมษายน': 4,
    'พ.ค.': 5, 'พฤษภา': 5, 'พฤษภาคม': 5,
    'มิ.ย.': 6, 'มิถุนา': 6, 'มิถุนายน': 6,
    'ก.ค.': 7, 'กรกฎา': 7, 'กรกฎาคม': 7,
    'ส.ค.': 8, 'สิงหา': 8, 'สิงหาคม': 8,
    'ก.ย.': 9, 'กันยา': 9, 'กันยายน': 9,
    'ต.ค.': 10, 'ตุลา': 10, 'ตุลาคม': 10,
    'พ.ย.': 11, 'พฤศจิกา': 11, 'พฤศจิกายน': 11,
    'ธ.ค.': 12, 'ธันวา': 12, 'ธันวาคม': 12
  };

  for (const [key, mNum] of Object.entries(monthMap)) {
    if (str.includes(key)) {
      month = mNum;
      break;
    }
  }

  return { year, month, formatted: str };
}

export const db = {
  getWhitelist() {
    try {
      if (!fs.existsSync(whitelistFilePath)) {
        return { allow_all: false, allowed_users: ['default'], allowed_groups: ['default'] };
      }
      const data = fs.readFileSync(whitelistFilePath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return { allow_all: false, allowed_users: ['default'], allowed_groups: ['default'] };
    }
  },

  saveWhitelist(wl) {
    fs.writeFileSync(whitelistFilePath, JSON.stringify(wl, null, 2), 'utf-8');
  },

  getMasterAdmin() {
    const wl = this.getWhitelist();
    return wl.master_admin || ['U38d0a817340abb35375641be73a86b5e', 'U38d0a817340a8b35375641be73a86b5e'];
  },

  isMasterAdmin(userId, contextId) {
    const adminSetting = this.getMasterAdmin();
    const cleanUser = String(userId || '').trim().toLowerCase();
    const cleanCtx = String(contextId || '').trim().toLowerCase();
    if (cleanUser === 'default' || cleanCtx === 'default') return true;

    const admins = Array.isArray(adminSetting) ? adminSetting : [adminSetting];
    return admins.some(a => {
      const cleanA = String(a).trim().toLowerCase();
      return cleanUser === cleanA || cleanCtx === cleanA;
    });
  },

  isContextAllowed(contextId, userId = null) {
    const wl = this.getWhitelist();
    if (wl.allow_all === true) return true;

    const cleanCtx = String(contextId || 'default').trim().toLowerCase();
    const cleanUser = String(userId || contextId || 'default').trim().toLowerCase();

    if (cleanCtx === 'default' || cleanUser === 'default') return true;

    // Master Admin มีสิทธิ์ใช้งานทุกที่และทุกโหมดแบบ 100%
    if (this.isMasterAdmin(userId, contextId)) return true;

    // หากคุยในกลุ่มไลน์ (contextId !== userId):
    if (cleanCtx !== cleanUser) {
      // หาก auto_approve_groups เป็น true (ค่าเริ่มต้นใหม่) -> กลุ่มไลน์ทุกกลุ่มที่คุณลากบอทเข้าไปจะใช้งานได้ทันที 100%!
      if (wl.auto_approve_groups !== false) return true;

      const isGroupAllowed = Array.isArray(wl.allowed_groups) && wl.allowed_groups.some(g => String(g).trim().toLowerCase() === cleanCtx);
      return isGroupAllowed;
    }

    // หากเป็นการคุยส่วนตัว 1-on-1 (contextId === userId) -> ตรวจสิทธิ์เฉพาะรายบุคคลที่ได้รับอนุญาตเท่านั้น (คนนอกยังคงถูกล็อก 100%)
    const isUserAllowed = Array.isArray(wl.allowed_users) && wl.allowed_users.some(u => {
      const cleanU = String(u).trim().toLowerCase();
      return cleanU === cleanUser || cleanU === cleanCtx;
    });

    return isUserAllowed;
  },

  addAllowedContext(contextId, type = 'user') {
    const wl = this.getWhitelist();
    const cleanId = String(contextId || 'default').trim();
    if (type === 'group') {
      if (!Array.isArray(wl.allowed_groups)) wl.allowed_groups = [];
      if (!wl.allowed_groups.includes(cleanId)) wl.allowed_groups.push(cleanId);
    } else {
      if (!Array.isArray(wl.allowed_users)) wl.allowed_users = [];
      if (!wl.allowed_users.includes(cleanId)) wl.allowed_users.push(cleanId);
    }
    this.saveWhitelist(wl);
    return wl;
  },

  removeAllowedContext(contextId) {
    const wl = this.getWhitelist();
    const cleanId = String(contextId || 'default').trim();
    if (Array.isArray(wl.allowed_users)) {
      wl.allowed_users = wl.allowed_users.filter(u => String(u).trim() !== cleanId);
    }
    if (Array.isArray(wl.allowed_groups)) {
      wl.allowed_groups = wl.allowed_groups.filter(g => String(g).trim() !== cleanId);
    }
    this.saveWhitelist(wl);
    return wl;
  },

  getStores(contextId = null) {
    try {
      const data = fs.readFileSync(storesFilePath, 'utf-8');
      const stores = JSON.parse(data);
      if (!contextId || contextId === 'all') return stores;
      const cleanCtx = String(contextId).toLowerCase().trim();
      return stores.filter(s => {
        const sCtx = String(s.context_id || 'default').toLowerCase().trim();
        return sCtx === cleanCtx;
      });
    } catch {
      return [];
    }
  },

  getAllStoresRaw() {
    try {
      const data = fs.readFileSync(storesFilePath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  saveStores(stores) {
    fs.writeFileSync(storesFilePath, JSON.stringify(stores, null, 2), 'utf-8');
  },

  findStoreByName(name, contextId = null) {
    if (!name) return null;
    const cleanTarget = cleanStoreName(name).toLowerCase().trim();
    if (!cleanTarget) return null;

    const stores = this.getStores(contextId);
    return stores.find(s => {
      const cleanSName = cleanStoreName(s.store_name || '').toLowerCase().trim();
      if (!cleanSName) return false;
      return cleanSName.includes(cleanTarget) || cleanTarget.includes(cleanSName);
    }) || null;
  },

  // 1. ข้อมูลพื้นฐานร้านค้า (Store Profile)
  saveGeneralInfo(storeName, infoData, mode = 'append', contextId = 'default') {
    const allStores = this.getAllStoresRaw();
    const targetName = cleanStoreName(storeName);
    const cleanCtx = String(contextId || 'default').toLowerCase().trim();

    let store = allStores.find(s => {
      const sName = cleanStoreName(s.store_name).toLowerCase();
      const sCtx = String(s.context_id || 'default').toLowerCase().trim();
      return sName === targetName.toLowerCase() && sCtx === cleanCtx;
    });

    const now = new Date().toISOString();

    if (!store) {
      store = {
        id: `STORE-${Date.now()}`,
        context_id: contextId || 'default',
        store_name: targetName,
        general_info: {},
        sales_details: {},
        sales_opportunities: {},
        updated_at: now
      };
      allStores.push(store);
    }

    if (mode === 'append') {
      const oldInfo = store.general_info || {};

      let mergedContacts = Array.isArray(oldInfo.contact_persons) ? [...oldInfo.contact_persons] : [];
      if (oldInfo.contact_person && mergedContacts.length === 0) {
        mergedContacts.push(oldInfo.contact_person);
      }

      if (infoData.contact_persons) {
        const newArr = Array.isArray(infoData.contact_persons) ? infoData.contact_persons : [infoData.contact_persons];
        newArr.forEach(c => {
          if (c && !mergedContacts.includes(c)) mergedContacts.push(c);
        });
      } else if (infoData.contact_person) {
        if (!mergedContacts.includes(infoData.contact_person)) {
          mergedContacts.push(infoData.contact_person);
        }
      }

      let mergedNotes = oldInfo.notes || '';
      if (infoData.notes && infoData.notes !== oldInfo.notes) {
        mergedNotes = mergedNotes ? `${mergedNotes}\n• ${infoData.notes}` : infoData.notes;
      }

      let mergedMap = oldInfo.map_url || '';
      if (infoData.map_url && infoData.map_url !== oldInfo.map_url) {
        mergedMap = infoData.map_url;
      }

      let mergedDelivery = oldInfo.delivery_by || oldInfo.delivery_schedule || '';
      if (infoData.delivery_by && infoData.delivery_by !== mergedDelivery) {
        mergedDelivery = mergedDelivery ? `${mergedDelivery} | ${infoData.delivery_by}` : infoData.delivery_by;
      }

      store.general_info = {
        ...oldInfo,
        store_name: targetName,
        contact_persons: mergedContacts,
        phone: infoData.phone !== undefined ? infoData.phone : oldInfo.phone,
        address: infoData.address !== undefined ? infoData.address : oldInfo.address,
        map_url: mergedMap,
        delivery_by: mergedDelivery,
        delivery_schedule: mergedDelivery
      };
    } else {
      store.general_info = {
        ...store.general_info,
        ...infoData,
        contact_persons: infoData.contact_persons || (infoData.contact_person ? [infoData.contact_person] : store.general_info?.contact_persons)
      };
    }

    store.updated_at = now;
    this.saveStores(allStores);
    return store;
  },

  // 2. ข้อมูลการขาย (Sales Details)
  saveSalesDetails(storeName, salesData, mode = 'append', contextId = 'default') {
    const allStores = this.getAllStoresRaw();
    const cleanName = cleanStoreName(storeName);
    const cleanCtx = String(contextId || 'default').toLowerCase().trim();

    let store = allStores.find(s => {
      const sName = cleanStoreName(s.store_name).toLowerCase();
      const sCtx = String(s.context_id || 'default').toLowerCase().trim();
      return sName === cleanName.toLowerCase() && sCtx === cleanCtx;
    });

    if (!store) {
      store = this.saveGeneralInfo(cleanName, { contact_person: 'ไม่ระบุ' }, 'append', contextId);
      return this.saveSalesDetails(cleanName, salesData, mode, contextId);
    }

    const oldDetails = store.sales_details || {};

    const paymentType = salesData.payment_type || oldDetails.payment_type || salesData.payment_status || oldDetails.payment_status || 'ไม่ระบุ';

    let mergedBrands = Array.isArray(oldDetails.brands_sold) ? [...oldDetails.brands_sold] : [];
    if (salesData.brands_sold) {
      const newBrands = Array.isArray(salesData.brands_sold) ? salesData.brands_sold : [salesData.brands_sold];
      newBrands.forEach(b => {
        if (b && !mergedBrands.includes(b)) mergedBrands.push(b);
      });
    }

    const lastOrderDate = salesData.last_order_date || oldDetails.last_order_date || new Date().toLocaleDateString('th-TH');
    const lastOrderAmount = salesData.last_order_amount || salesData.total_sales_ytd || oldDetails.last_order_amount || 0;

    const dateParsed = parseCalendarYearMonth(lastOrderDate);
    let orderHistory = Array.isArray(oldDetails.order_history) ? [...oldDetails.order_history] : [];

    if (lastOrderAmount > 0) {
      orderHistory.push({
        date: lastOrderDate,
        amount: lastOrderAmount,
        year: dateParsed.year,
        month: dateParsed.month,
        timestamp: Date.now()
      });
    }

    const calendarYear = dateParsed.year;
    const calendarMonth = dateParsed.month;

    const yearlySalesYTD = orderHistory
      .filter(o => o.year === calendarYear)
      .reduce((sum, o) => sum + (o.amount || 0), 0);

    const monthlySales = orderHistory
      .filter(o => o.year === calendarYear && o.month === calendarMonth)
      .reduce((sum, o) => sum + (o.amount || 0), 0);

    const yearlyBreakdownMap = {};
    orderHistory.forEach(o => {
      const y = o.year || calendarYear;
      yearlyBreakdownMap[y] = (yearlyBreakdownMap[y] || 0) + (o.amount || 0);
    });

    const yearlyBreakdown = Object.entries(yearlyBreakdownMap)
      .map(([y, total]) => ({
        year: parseInt(y),
        buddhistYear: parseInt(y) + 543,
        total: total
      }))
      .sort((a, b) => b.year - a.year);

    let mergedOrderedItems = Array.isArray(oldDetails.ordered_items) ? [...oldDetails.ordered_items] : [];
    if (salesData.ordered_items) {
      const newItems = Array.isArray(salesData.ordered_items) ? salesData.ordered_items : [salesData.ordered_items];
      newItems.forEach(item => {
        if (item && !mergedOrderedItems.includes(item)) mergedOrderedItems.push(item);
      });
    }

    let mergedTopSelling = Array.isArray(oldDetails.top_selling_products) ? [...oldDetails.top_selling_products] : (oldDetails.top_purchased_products || []);
    if (salesData.top_selling_products || salesData.top_purchased_products) {
      const newTop = salesData.top_selling_products || salesData.top_purchased_products;
      const arr = Array.isArray(newTop) ? newTop : [newTop];
      arr.forEach(t => {
        if (t && !mergedTopSelling.includes(t)) mergedTopSelling.push(t);
      });
    }

    store.sales_details = {
      ...oldDetails,
      payment_type: paymentType,
      brands_sold: mergedBrands.length > 0 ? mergedBrands : ['-'],
      last_order_date: lastOrderDate,
      last_order_amount: lastOrderAmount,
      calendar_year: calendarYear,
      calendar_month: calendarMonth,
      monthly_sales: monthlySales,
      yearly_sales_ytd: yearlySalesYTD > 0 ? yearlySalesYTD : (oldDetails.yearly_sales_ytd || lastOrderAmount),
      total_sales_ytd: yearlySalesYTD > 0 ? yearlySalesYTD : (oldDetails.total_sales_ytd || lastOrderAmount),
      order_history: orderHistory,
      yearly_breakdown: yearlyBreakdown.length > 0 ? yearlyBreakdown : (oldDetails.yearly_breakdown || []),
      ordered_items: mergedOrderedItems,
      top_selling_products: mergedTopSelling
    };

    store.updated_at = new Date().toISOString();
    this.saveStores(allStores);
    return store;
  },

  // 3. โอกาสเสนอขายของร้านค้า (Store Sales Opportunities)
  saveSalesOpportunities(storeName, oppData, mode = 'replace', contextId = 'default') {
    const allStores = this.getAllStoresRaw();
    const targetName = cleanStoreName(storeName);
    const cleanCtx = String(contextId || 'default').toLowerCase().trim();

    let store = allStores.find(s => {
      const sName = cleanStoreName(s.store_name).toLowerCase();
      const sCtx = String(s.context_id || 'default').toLowerCase().trim();
      return sName === targetName.toLowerCase() && sCtx === cleanCtx;
    });

    const now = new Date().toISOString();

    if (!store) {
      store = this.saveGeneralInfo(targetName, { contact_person: 'ไม่ระบุ' }, 'append', contextId);
      return this.saveSalesOpportunities(targetName, oppData, mode, contextId);
    }

    if (mode === 'append') {
      const oldOpp = store.sales_opportunities || {};
      let mergedRec = Array.isArray(oldOpp.recommended_products) ? [...oldOpp.recommended_products] : [];
      if (oppData.recommended_products) {
        oppData.recommended_products.forEach(p => {
          if (!mergedRec.includes(p)) mergedRec.push(p);
        });
      }
      store.sales_opportunities = {
        ...oldOpp,
        ...oppData,
        recommended_products: mergedRec
      };
    } else {
      store.sales_opportunities = { ...store.sales_opportunities, ...oppData };
    }

    store.updated_at = now;
    this.saveStores(allStores);
    return store;
  },

  // ลบสินค้าแนะนำเสนอขายออกจากรายการ
  removeRecommendedProduct(storeName, itemToRemove, contextId = 'default') {
    const allStores = this.getAllStoresRaw();
    const targetName = cleanStoreName(storeName);
    const cleanCtx = String(contextId || 'default').toLowerCase().trim();

    let store = allStores.find(s => {
      const sName = cleanStoreName(s.store_name).toLowerCase();
      const sCtx = String(s.context_id || 'default').toLowerCase().trim();
      return sName === targetName.toLowerCase() && sCtx === cleanCtx;
    });

    if (!store || !store.sales_opportunities) return null;

    const oldRec = Array.isArray(store.sales_opportunities.recommended_products) 
      ? store.sales_opportunities.recommended_products 
      : [];

    let newRec = [];
    if (itemToRemove !== 'ALL' && itemToRemove !== 'ทั้งหมด') {
      const cleanTargetItem = String(itemToRemove).trim().toLowerCase();
      newRec = oldRec.filter(p => String(p).trim().toLowerCase() !== cleanTargetItem);
    }

    store.sales_opportunities.recommended_products = newRec;
    store.updated_at = new Date().toISOString();
    this.saveStores(allStores);
    return store;
  },

  // ค้นหาสินค้าจากรหัสสินค้า (SKU) เท่านั้น
  findProductByCode(code = '') {
    try {
      if (!code) return null;
      const data = fs.readFileSync(productsFilePath, 'utf-8');
      const products = JSON.parse(data);
      const cleanCode = code.toLowerCase().trim();
      return products.find(p => p.product_code && p.product_code.toLowerCase() === cleanCode) ||
             products.find(p => p.product_code && p.product_code.toLowerCase().includes(cleanCode));
    } catch {
      return null;
    }
  },

  // ค้นหาสินค้าจากการค้นหาข้อมูลที่ตรงกันจากทุกหัวข้อ (ครบทั้ง 7 หัวข้อหลัก)
  searchProducts(query = '') {
    try {
      const data = fs.readFileSync(productsFilePath, 'utf-8');
      const products = JSON.parse(data);
      if (!query || query.trim() === '') return products;
      const cleanQ = query.toLowerCase().trim();
      return products.filter(p => 
        (p.name && p.name.toLowerCase().includes(cleanQ)) || 
        (p.product_code && p.product_code.toLowerCase().includes(cleanQ)) ||
        (p.brand && p.brand.toLowerCase().includes(cleanQ)) ||
        (p.category && p.category.toLowerCase().includes(cleanQ)) ||
        (p.price !== undefined && String(p.price).includes(cleanQ)) ||
        (p.tags && p.tags.some(t => String(t).toLowerCase().includes(cleanQ))) ||
        (p.image_url && p.image_url.toLowerCase().includes(cleanQ))
      );
    } catch {
      return [];
    }
  },

  // 4. บันทึกและเพิ่ม/แก้ไขสินค้าเข้าระบบ (Save / Update Product - 7 หัวข้อหลัก)
  saveProduct(productData, targetName = null) {
    try {
      const data = fs.readFileSync(productsFilePath, 'utf-8');
      const products = JSON.parse(data);

      const searchName = targetName ? targetName.trim().toLowerCase() : (productData.name ? productData.name.trim().toLowerCase() : '');
      let product = null;

      if (searchName) {
        product = products.find(p => 
          p.name.toLowerCase() === searchName || 
          p.name.toLowerCase().includes(searchName) || 
          (productData.product_code && p.product_code && p.product_code.toLowerCase() === productData.product_code.toLowerCase())
        );
      }

      if (!product && productData.name) {
        const cleanName = productData.name.trim().toLowerCase();
        product = products.find(p => p.name.toLowerCase() === cleanName || p.name.toLowerCase().includes(cleanName));
      }

      const defaultImage = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=60';

      if (product) {
        if (productData.name && !targetName) product.name = productData.name.trim();
        if (productData.product_code) product.product_code = productData.product_code.trim();
        if (productData.brand) product.brand = productData.brand.trim();
        if (productData.category) product.category = productData.category.trim();
        if (productData.price !== null && productData.price !== undefined) product.price = productData.price;
        if (productData.stock !== undefined) product.stock = productData.stock;
        if (productData.image_url) product.image_url = productData.image_url.trim();
        if (Array.isArray(productData.tags) && productData.tags.length > 0) product.tags = productData.tags;
      } else {
        const cleanName = productData.name ? productData.name.trim() : `สินค้า-${Date.now()}`;
        const code = productData.product_code || `SKU-${Date.now().toString().slice(-6)}`;
        const brand = productData.brand || 'ไม่ระบุ';
        const category = productData.category || 'สินค้าทั่วไป';
        const price = productData.price !== null && productData.price !== undefined ? productData.price : 0;
        const image_url = productData.image_url || defaultImage;
        const tags = Array.isArray(productData.tags) && productData.tags.length > 0
          ? productData.tags
          : [cleanName, brand, category].filter(t => t && t !== 'ไม่ระบุ' && t !== 'สินค้าทั่วไป');

        product = {
          id: `PROD-${Date.now()}`,
          product_code: code,
          name: cleanName,
          brand: brand,
          category: category,
          price: price,
          stock: productData.stock || 10,
          tags: tags,
          image_url: image_url
        };
        products.push(product);
      }

      fs.writeFileSync(productsFilePath, JSON.stringify(products, null, 2), 'utf-8');
      return product;
    } catch (err) {
      console.error('Error saving product:', err.message);
      return null;
    }
  }
};
