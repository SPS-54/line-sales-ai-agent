/**
 * Utility functions for parsing unstructured Thai text inputs into structured schemas.
 */

// 1. หมวดข้อมูลพื้นฐานร้านค้า (Store Profile - 7 หัวข้อ)
export function parseGeneralInfoText(text) {
  if (!text) return {};

  let storeName = null;
  const storeNameMatch = text.match(/(?:บันทึกร้าน|อัปเดตข้อมูลร้าน|ร้านค้า|ร้าน)\s*:?\s*([ก-๙a-zA-Z0-9\s]+?)(?:ผู้ติดต่อ|เบอร์|โทร|ที่อยู่|แผนที่|จัดส่ง|เครดิต|โน้ต|$)/i);
  if (storeNameMatch) {
    storeName = storeNameMatch[1].trim();
  }

  // 1. รายชื่อผู้ติดต่อ (contact_persons & contact_person)
  let contactPersons = [];
  const contactPersonsMatch = text.match(/(?:รายชื่อผู้ติดต่อ|ผู้ติดต่อ|ติดต่อ)\s*:?\s*([^,;\n]+?)(?:เบอร์|โทร|ที่อยู่|แผนที่|จัดส่ง|เครดิต|โน้ต|$)/i);
  if (contactPersonsMatch) {
    const rawContacts = contactPersonsMatch[1].trim();
    contactPersons = rawContacts.split(/[,;\n]/).map(c => c.trim()).filter(Boolean);
  }

  // 2. เบอร์โทรศัพท์หลัก (phone)
  let phone = null;
  const phoneMatch = text.match(/(?:เบอร์โทรศัพท์หลัก|เบอร์โทรหลัก|เบอร์โทร|เบอร์|โทร)\s*:?\s*([0-9\-\s]{9,15})/i);
  if (phoneMatch) {
    phone = phoneMatch[1].trim();
  }

  // 3. ที่อยู่ร้าน (address)
  let address = null;
  const addressMatch = text.match(/(?:ที่อยู่ร้าน|ที่อยู่)\s*:?\s*([^,;\n]+?)(?:แผนที่|จัดส่ง|เครดิต|โน้ต|$)/i);
  if (addressMatch) {
    address = addressMatch[1].trim();
  }

  // 4. แผนที่ร้าน (map_url)
  let mapUrl = null;
  const mapMatch = text.match(/(?:แผนที่ร้าน|แผนที่|พิกัด|google\s*maps?)\s*:?\s*(https?:\/\/[^\s\n]+|[0-9\.\,]+)/i);
  if (mapMatch) {
    mapUrl = mapMatch[1].trim();
  }

  // 5. จัดส่งโดย (delivery_by)
  let deliveryBy = null;
  const deliveryMatch = text.match(/(?:จัดส่งโดย|จัดส่ง|ช่องทางจัดส่ง|ขนส่ง)\s*:?\s*([^,;\n]+?)(?:เครดิต|โน้ต|$)/i);
  if (deliveryMatch) {
    deliveryBy = deliveryMatch[1].trim();
  }

  // 6. เครดิตเทอม (credit_days)
  let creditDays = null;
  const creditMatch = text.match(/(?:เครดิตเทอม|เครดิต)\s*:?\s*(\d+)\s*(?:วัน)?/i);
  if (creditMatch) {
    creditDays = parseInt(creditMatch[1]);
  }

  // 7. โน้ตเพิ่มเติม (notes)
  let notes = null;
  const notesMatch = text.match(/(?:โน้ตเพิ่มเติม|โน้ต|หมายเหตุ)\s*:?\s*(.+)/i);
  if (notesMatch) {
    notes = notesMatch[1].trim();
  }

  return {
    store_name: storeName,
    contact_person: contactPersons.length > 0 ? contactPersons.join(', ') : null,
    contact_persons: contactPersons.length > 0 ? contactPersons : null,
    phone,
    address,
    map_url: mapUrl,
    delivery_by: deliveryBy,
    delivery_schedule: deliveryBy,
    credit_days: creditDays,
    notes
  };
}

// 2. หมวดข้อมูลการขาย (Sales Performance - 7 หัวข้อ)
export function parseSalesDetailsText(text) {
  if (!text) return {};

  let paymentType = null;
  const paymentMatch = text.match(/(?:ประเภทการชำระ|ประเภทชำระ|การชำระ|ชำระเงิน|วิธีชำระ)\s*:?\s*([^,;\n]+?)(?:แบรนด์|สั่งซื้อ|ยอดขาย|สินค้า|$)/i);
  if (paymentMatch) {
    paymentType = paymentMatch[1].trim();
  }

  let brandsSold = [];
  const brandsMatch = text.match(/(?:แบรนด์ที่ขาย|แบรนด์|ยี่ห้อ)\s*:?\s*([^,;\n]+?)(?:สั่งซื้อ|ยอดขาย|สินค้า|$)/i);
  if (brandsMatch) {
    const rawBrands = brandsMatch[1].trim();
    brandsSold = rawBrands.split(/[,;\n]|และ/).map(b => b.trim()).filter(Boolean);
  }

  let lastOrderDate = null;
  const dateMatch = text.match(/(?:สั่งซื้อล่าสุด|สั่งซื้อเมื่อ|วันที่สั่ง|สั่งล่าสุด)\s*:?\s*([0-9ก-๙a-zA-Z\s\/\-]+?)(?:ยอดขาย|สินค้า|$)/i);
  if (dateMatch) {
    lastOrderDate = dateMatch[1].trim();
  }

  let lastOrderAmount = null;
  const amountMatch = text.match(/(?:ยอดขายล่าสุด|ยอดล่าสุด|ยอดสั่งล่าสุด|ยอดเงิน)\s*:?\s*([\d,]+)\s*(?:บาท)?/i);
  if (amountMatch) {
    lastOrderAmount = parseInt(amountMatch[1].replace(/,/g, ''));
  }

  let orderedItems = [];
  const orderedMatch = text.match(/(?:สินค้าที่สั่ง|รายการที่สั่ง|สินค้าสั่งซื้อ)\s*:?\s*([^,;\n]+?)(?:สินค้าขายดี|$)/i);
  if (orderedMatch) {
    const rawOrdered = orderedMatch[1].trim();
    orderedItems = rawOrdered.split(/[,;\n]|และ/).map(i => i.trim()).filter(Boolean);
  }

  let topSellingProducts = [];
  const topMatch = text.match(/(?:สินค้าขายดี|ขายดี|ยอดนิยม)\s*:?\s*(.+)/i);
  if (topMatch) {
    const rawTop = topMatch[1].trim();
    topSellingProducts = rawTop.split(/[,;\n]|และ/).map(t => t.trim()).filter(Boolean);
  }

  return {
    payment_type: paymentType,
    brands_sold: brandsSold.length > 0 ? brandsSold : null,
    last_order_date: lastOrderDate,
    last_order_amount: lastOrderAmount,
    ordered_items: orderedItems.length > 0 ? orderedItems : null,
    top_selling_products: topSellingProducts.length > 0 ? topSellingProducts : null
  };
}

// 3. หมวดโอกาสเสนอขาย (Sales Opportunities)
export function parseSalesOpportunitiesText(text) {
  if (!text) return {};

  let status = null;
  const statusMatch = text.match(/(?:สถานะโอกาส|สถานะ|โอกาส)\s*:?\s*(สูง|ปานกลาง|ต่ำ|High|Medium|Low|ทั่วไป)/i);
  if (statusMatch) {
    status = statusMatch[1].trim();
  }

  let recommendedProducts = [];
  const recMatch = text.match(/(?:สินค้าแนะนำเสนอขาย|สินค้าแนะนำ|เสนอขายสินค้า|แนะนำ)\s*:?\s*([^,;\n]+?)(?:เหตุผล|โอกาสทอง|แผนงาน|เป้าหมาย|$)/i);
  if (recMatch) {
    const rawRec = recMatch[1].trim();
    recommendedProducts = rawRec.split(/[,;\n]|และ/).map(r => r.trim()).filter(Boolean);
  }

  let reason = null;
  const reasonMatch = text.match(/(?:เหตุผล\s*\/\s*โอกาสทอง|เหตุผล|โอกาสทอง)\s*:?\s*([^,;\n]+?)(?:แผนงาน|เป้าหมาย|วันเสนอขาย|$)/i);
  if (reasonMatch) {
    reason = reasonMatch[1].trim();
  }

  let targetDate = null;
  const targetMatch = text.match(/(?:แผนงานวันเข้าเสนอขาย|แผนงานเสนอขาย|วันเข้าเสนอขาย|เป้าหมายวันที่เสนอขาย|เป้าหมายวัน|วันเสนอขาย)\s*:?\s*(สัปดาห์หน้า|เดือนหน้า|ต้นเดือนหน้า|[\dก-๙a-zA-Z\s]+)/i);
  if (targetMatch) {
    targetDate = targetMatch[1].trim();
  }

  return {
    opportunity_status: status ? (status.includes('สูง') ? '🔥 สูง (High Potential)' : status) : null,
    recommended_products: recommendedProducts.length > 0 ? recommendedProducts : null,
    reason,
    target_pitch_date: targetDate
  };
}

// 4. สกัดข้อมูลสินค้าสำหรับบันทึก/แก้ไข (Product Text Parser - 7 หัวข้อหลัก)
export function parseProductText(text) {
  if (!text) return {};

  let cleanText = text.replace(/^(?:ขอแก้ไขสินค้า|แก้ไขสินค้า|แก้ไขรูปสินค้า|ขอเพิ่มสินค้า|เพิ่มสินค้า|บันทึกสินค้า|เพิ่มรูปสินค้า)\s*:?\s*/gi, '').trim();

  // 1. ดึงรูปภาพ
  let imageUrl = '';
  const imageMatch = cleanText.match(/(https?:\/\/[^\s\n]+)/i);
  if (imageMatch) {
    imageUrl = imageMatch[1].trim();
    cleanText = cleanText.replace(imageMatch[0], '').trim();
  }

  // 2. ดึงราคา (รองรับทั้ง "290 บาท" และ "ราคา 290")
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

  // 3. ดึงรหัสสินค้า (SKU)
  let productCode = null;
  const codeMatch = cleanText.match(/(?:รหัสสินค้า|รหัส|sku)\s*:?\s*([^,\n\s]+)/i);
  if (codeMatch) {
    productCode = codeMatch[1].trim();
    cleanText = cleanText.replace(codeMatch[0], '').trim();
  }

  // 4. ดึงยี่ห้อ (Brand)
  let brand = null;
  const brandMatch = cleanText.match(/(?:ยี่ห้อ|แบรนด์|brand)\s*:?\s*([^,\n]+)/i);
  if (brandMatch) {
    brand = brandMatch[1].trim();
    cleanText = cleanText.replace(brandMatch[0], '').trim();
  }

  // 5. ดึงหมวดสินค้า (Category)
  let category = null;
  const categoryMatch = cleanText.match(/(?:หมวดสินค้า|หมวดหมู่|หมวด)\s*:?\s*([^,\n]+)/i);
  if (categoryMatch) {
    category = categoryMatch[1].trim();
    cleanText = cleanText.replace(categoryMatch[0], '').trim();
  }

  // 6. ดึงแท็ก (Tags)
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

  // 7. ดึงชื่อสินค้า (Name)
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
