/**
 * Utility functions for parsing unstructured Thai text inputs into structured schemas.
 * Uses Positional Keyword Slicing to support both single-line and multiline inputs 100% accurately.
 */

const KEYWORD_MAP = [
  // Store Name (เฉพาะเมื่ออยู่ต้นข้อความเท่านั้น)
  { key: 'store_name', regex: /^(?:บันทึกข้อมูลร้าน|บันทึกข้อมูล|บันทึกร้าน|อัปเดตข้อมูลร้าน|ร้านค้า|ร้าน)/i },
  // General Info
  { key: 'contact_persons', regex: /(?:รายชื่อผู้ติดต่อ|ผู้ติดต่อ|ติดต่อ)/i },
  { key: 'phone', regex: /(?:เบอร์โทรศัพท์หลัก|เบอร์โทรหลัก|เบอร์โทร|เบอร์|โทร)/i },
  { key: 'address', regex: /(?:ที่อยู่ร้าน|ที่อยู่)/i },
  { key: 'map_url', regex: /(?:แผนที่ร้าน|แผนที่|พิกัด|google\s*maps?)/i },
  { key: 'delivery_by', regex: /(?:จัดส่งโดย|ช่องทางจัดส่ง|จัดส่ง|ขนส่ง)/i },
  { key: 'credit_days', regex: /(?:เครดิตเทอม|เครดิต)/i },
  { key: 'notes', regex: /(?:โน้ตเพิ่มเติม|หมายเหตุ|โน้ต)/i },
  { key: 'line_contact', regex: /(?:ไลน์ผู้ติดต่อ|ไลน์ร้าน|ติดต่อไลน์|ไลน์ไอดี|line\s*id|line\s*contact|ไลน์)/i },
  // Sales Details
  { key: 'payment_type', regex: /(?:ประเภทการชำระ|ประเภทชำระ|การชำระเงิน|การชำระ|วิธีชำระ|ชำระเงิน)/i },
  { key: 'brands_sold', regex: /(?:แบรนด์ที่ขาย|แบรนด์|ยี่ห้อ)/i },
  { key: 'last_order_date', regex: /(?:สั่งซื้อล่าสุด|สั่งซื้อเมื่อ|วันที่สั่ง|สั่งล่าสุด)/i },
  { key: 'last_order_amount', regex: /(?:ยอดขายล่าสุด|ยอดล่าสุด|ยอดสั่งล่าสุด|ยอดเงิน)/i },
  { key: 'ordered_items', regex: /(?:สินค้าที่สั่ง|รายการที่สั่ง|สินค้าสั่งซื้อ)/i },
  { key: 'top_selling_products', regex: /(?:สินค้าขายดี|ขายดี|ยอดนิยม)/i },
  // Sales Opportunities
  { key: 'opportunity_status', regex: /(?:สถานะโอกาส|สถานะ)/i },
  { key: 'recommended_products', regex: /(?:สินค้าแนะนำเสนอขาย|สินค้าแนะนำ|เสนอขายสินค้า)/i },
  { key: 'reason', regex: /(?:เหตุผล\s*\/\s*โอกาสทอง|เหตุผล|โอกาสทอง)/i },
  { key: 'target_pitch_date', regex: /(?:แผนงานวันเข้าเสนอขาย|แผนงานเสนอขาย|วันเข้าเสนอขาย|เป้าหมายวันที่เสนอขาย|เป้าหมายวัน|วันเสนอขาย)/i }
];

const cleanValue = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/^[•\-\*:=\s]+/, '')
    .replace(/[•\-\*\s]+$/, '')
    .trim();
};

export function parseAllStoreCategories(text) {
  if (!text) return { general_info: {}, sales_details: {}, sales_opportunities: {} };

  // 1. ค้นหาตำแหน่ง keyword ทั้งหมดในข้อความ
  const matches = [];
  for (const item of KEYWORD_MAP) {
    const globalReg = new RegExp(item.regex.source, 'gi');
    let m;
    while ((m = globalReg.exec(text)) !== null) {
      matches.push({
        key: item.key,
        index: m.index,
        length: m[0].length,
        matchedText: m[0]
      });
    }
  }

  // 2. เรียงลำดับตามตำแหน่งที่พบในข้อความ
  matches.sort((a, b) => a.index - b.index);

  // 3. กรองคำซ้อนทับกัน (เลือกคำที่ยาวกว่าหรือมาก่อน)
  const filteredMatches = [];
  for (const m of matches) {
    if (filteredMatches.length === 0) {
      filteredMatches.push(m);
    } else {
      const last = filteredMatches[filteredMatches.length - 1];
      if (m.index >= last.index + last.length) {
        filteredMatches.push(m);
      }
    }
  }

  // 4. หั่นสกัดข้อความระหว่างตำแหน่งคำ
  const parsedData = {};
  for (let i = 0; i < filteredMatches.length; i++) {
    const curr = filteredMatches[i];
    const valStart = curr.index + curr.length;
    const valEnd = (i + 1 < filteredMatches.length) ? filteredMatches[i + 1].index : text.length;
    const rawVal = text.substring(valStart, valEnd);
    const cleaned = cleanValue(rawVal);

    if (cleaned && !parsedData[curr.key]) {
      parsedData[curr.key] = cleaned;
    }
  }

  // 5. จัดรูปแบบลงโครงสร้าง Schema ของแต่ละหมวดหมู่
  let storeName = parsedData.store_name || null;
  if (storeName) {
    storeName = storeName.split(/[\n,:\r]/)[0].trim();
  }

  // 5.1 ข้อมูลพื้นฐานร้านค้า (General Info)
  const contactRaw = parsedData.contact_persons;
  const contactPersons = contactRaw ? contactRaw.split(/[,;\n]|และ/).map(c => cleanValue(c)).filter(Boolean) : [];
  const creditNum = parsedData.credit_days ? parseInt(parsedData.credit_days.replace(/\D/g, '')) : null;

  const phoneRaw = parsedData.phone;
  const phones = phoneRaw ? phoneRaw.split(/[,;\n\/]|และ/).map(p => cleanValue(p)).filter(Boolean) : [];

  const lineRaw = parsedData.line_contact;
  const lineContacts = lineRaw ? lineRaw.split(/[,;\n]|และ/).map(l => cleanValue(l)).filter(Boolean) : [];

  const general_info = {
    store_name: storeName,
    contact_person: contactPersons.length > 0 ? contactPersons.join(', ') : null,
    contact_persons: contactPersons.length > 0 ? contactPersons : null,
    phone: phones.length > 0 ? phones.join(', ') : (parsedData.phone || null),
    phones: phones.length > 0 ? phones : null,
    address: parsedData.address || null,
    map_url: parsedData.map_url || null,
    delivery_by: parsedData.delivery_by || null,
    delivery_schedule: parsedData.delivery_by || null,
    credit_days: isNaN(creditNum) ? null : creditNum,
    notes: parsedData.notes || null,
    line_contact: lineContacts.length > 0 ? lineContacts.join(', ') : null,
    line_contacts: lineContacts.length > 0 ? lineContacts : null
  };

  // 5.2 ข้อมูลการขาย (Sales Details)
  const brandsRaw = parsedData.brands_sold;
  const brandsSold = brandsRaw ? brandsRaw.split(/[,;\n]|และ/).map(b => cleanValue(b)).filter(Boolean) : [];
  const itemsRaw = parsedData.ordered_items;
  const orderedItems = itemsRaw ? itemsRaw.split(/[,;\n]|และ/).map(i => cleanValue(i)).filter(Boolean) : [];
  const topRaw = parsedData.top_selling_products;
  const topSellingProducts = topRaw ? topRaw.split(/[,;\n]|และ/).map(t => cleanValue(t)).filter(Boolean) : [];
  const amtNum = parsedData.last_order_amount ? parseInt(parsedData.last_order_amount.replace(/,/g, '').replace(/\D/g, '')) : null;

  const sales_details = {
    payment_type: parsedData.payment_type || null,
    brands_sold: brandsSold.length > 0 ? brandsSold : null,
    last_order_date: parsedData.last_order_date || null,
    last_order_amount: isNaN(amtNum) ? null : amtNum,
    ordered_items: orderedItems.length > 0 ? orderedItems : null,
    top_selling_products: topSellingProducts.length > 0 ? topSellingProducts : null
  };

  // 5.3 โอกาสเสนอขาย (Sales Opportunities)
  const recRaw = parsedData.recommended_products;
  const recommendedProducts = recRaw ? recRaw.split(/[,;\n]|และ/).map(r => cleanValue(r)).filter(Boolean) : [];
  const status = parsedData.opportunity_status;

  const sales_opportunities = {
    opportunity_status: status ? (status.includes('สูง') ? '🔥 สูง (High Potential)' : status) : null,
    recommended_products: recommendedProducts.length > 0 ? recommendedProducts : null,
    reason: parsedData.reason || null,
    target_pitch_date: parsedData.target_pitch_date || null
  };

  return {
    store_name: storeName,
    general_info,
    sales_details,
    sales_opportunities
  };
}

export function parseGeneralInfoText(text) {
  return parseAllStoreCategories(text).general_info;
}

export function parseSalesDetailsText(text) {
  return parseAllStoreCategories(text).sales_details;
}

export function parseSalesOpportunitiesText(text) {
  return parseAllStoreCategories(text).sales_opportunities;
}

export function parseProductText(text) {
  if (!text) return {};

  let cleanText = text.replace(/^(?:ขอแก้ไขสินค้า|แก้ไขสินค้า|แก้ไขรูปสินค้า|ขอเพิ่มสินค้า|เพิ่มสินค้า|บันทึกสินค้า|เพิ่มรูปสินค้า)\s*:?\s*/gi, '').trim();

  let imageUrl = '';
  const imageMatch = cleanText.match(/(https?:\/\/[^\s\n]+)/i);
  if (imageMatch) {
    imageUrl = imageMatch[1].trim();
    cleanText = cleanText.replace(imageMatch[0], '').trim();
  }

  let price = null;
  const priceBeforeMatch = cleanText.match(/(\d[\d,]*)\s*(?:บาท|฿)/i);
  const priceAfterMatch = cleanText.match(/(?:ราคา|\$|฿)\s*:?\s*(\d[\d,]*)/i);

  if (priceBeforeMatch) {
    price = parseInt(priceBeforeMatch[1].replace(/,/g, ''));
    cleanText = cleanText.replace(priceBeforeMatch[0], '').trim();
  } else if (priceAfterMatch) {
    price = parseInt(priceAfterMatch[1].replace(/,/g, ''));
    cleanText = cleanText.replace(priceAfterMatch[0], '').trim();
  } else {
    const standaloneNum = cleanText.match(/\b(\d{2,6})\b/);
    if (standaloneNum) {
      price = parseInt(standaloneNum[1]);
      cleanText = cleanText.replace(standaloneNum[0], '').trim();
    }
  }

  let productCode = null;
  const codeMatch = cleanText.match(/(?:รหัสสินค้า|รหัส|sku)\s*:?\s*([^,\n\s]+)/i);
  if (codeMatch) {
    productCode = codeMatch[1].trim();
    cleanText = cleanText.replace(codeMatch[0], '').trim();
  }

  let brand = null;
  const brandMatch = cleanText.match(/(?:ยี่ห้อ|แบรนด์|brand)\s*:?\s*([^,\n]+)/i);
  if (brandMatch) {
    brand = brandMatch[1].trim();
    cleanText = cleanText.replace(brandMatch[0], '').trim();
  }

  let category = null;
  const categoryMatch = cleanText.match(/(?:หมวดสินค้า|หมวดหมู่|หมวด)\s*:?\s*([^,\n]+)/i);
  if (categoryMatch) {
    category = categoryMatch[1].trim();
    cleanText = cleanText.replace(categoryMatch[0], '').trim();
  }

  let tags = [];
  const tagMatch = cleanText.match(/(?:แท็ก|คีย์เวิร์ด|tags)\s*:?\s*([^,\n]+)/i);
  if (tagMatch) {
    tags = tagMatch[1].split(/[\s#]+/).map(t => t.trim()).filter(Boolean);
    cleanText = cleanText.replace(tagMatch[0], '').trim();
  } else {
    const standaloneTags = cleanText.match(/#([ก-๙a-zA-Z0-9_]+)/g);
    if (standaloneTags) {
      tags = standaloneTags.map(t => t.replace('#', '').trim()).filter(Boolean);
      cleanText = cleanText.replace(/#([ก-๙a-zA-Z0-9_]+)/g, '').trim();
    }
  }

  let name = '';
  const nameMatch = cleanText.match(/(?:ชื่อสินค้า|ชื่อ)\s*:?\s*([^,\n]+)/i);
  if (nameMatch) {
    name = nameMatch[1].trim();
  } else {
    name = cleanText
      .split(/[,;\n:]/)[0]
      .replace(/[\d,]+/g, '')
      .replace(/(?:ราคา|บาท|\$|฿|สต็อก|จำนวน|ชิ้น)/gi, '')
      .replace(/[:=]/g, '')
      .trim();
  }

  return {
    name: name || 'สินค้าใหม่',
    product_code: productCode,
    brand: brand,
    category: category,
    price: price,
    tags: tags.length > 0 ? tags : null,
    image_url: imageUrl
  };
}
