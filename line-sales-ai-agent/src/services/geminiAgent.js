import { config } from '../config.js';
import { db, cleanStoreName } from '../database/db.js';
import { sessionStore } from './sessionStore.js';
import { 
  parseGeneralInfoText, 
  parseSalesDetailsText, 
  parseSalesOpportunitiesText
} from '../utils/textParser.js';
import { 
  getGeneralInfoDeclaration, saveGeneralInfoDeclaration,
  getSalesDetailsDeclaration, saveSalesDetailsDeclaration,
  getSalesOpportunitiesDeclaration, saveSalesOpportunitiesDeclaration
} from '../tools/storeTool.js';
import { 
  buildStoreGeneralInfoFlex,
  buildStoreSalesDetailsFlex,
  buildStoreSalesOpportunitiesFlex,
  buildDeleteRecommendedProductsFlex,
  buildConfirmationFlex,
  buildCategoryMenuFlex,
  buildFormGuideFlex,
  buildWizardPromptFlex
} from './lineFormatter.js';

const SYSTEM_INSTRUCTION = `คุณคือ "SalesAI Assistant" ผู้ช่วยพนักงานขายอัจฉริยะในไลน์
หน้าที่ของคุณคือช่วยงานพนักงานขายโดยนำข้อมูลที่ได้รับไปจำแนกใส่ลงใน 3 หมวดหมู่หลัก:
1. "ข้อมูลร้านค้า": บันทึก/ดึงข้อมูลพื้นฐานร้านค้า (ผู้ติดต่อ, เบอร์โทรศัพท์หลัก, ที่อยู่ร้าน, แผนที่ร้าน, จัดส่งโดย, เครดิตเทอม, โน้ตเพิ่มเติม) (ใช้ get_store_general_info / save_store_general_info)
2. "ข้อมูลการขาย": บันทึก/ดึงข้อมูลการขาย (ประเภทการชำระ, แบรนด์ที่ขาย, สั่งซื้อล่าสุด, ยอดขายล่าสุด, ยอดขายสะสม เดือน/ปี, ยอดขายรายปี, สินค้าที่สั่ง, สินค้าขายดี) (ใช้ get_store_sales_details / save_store_sales_details)
3. "โอกาสเสนอขาย": บันทึก/ดึงโอกาสเสนอขาย (สถานะโอกาส, สินค้าแนะนำ, เหตุผล, แผนงานวันเข้าเสนอขาย) (ใช้ get_store_sales_opportunities / save_store_sales_opportunities)`;

export async function processUserMessage(userMessage) {
  const text = (userMessage || '').trim();
  const lowerText = text.toLowerCase();

  // 1. ตรวจสอบสถานะรอรับค่าเฉพาะหัวข้อเดียว (1-Field Prompt Response Handling)
  const pendingField = sessionStore.findActivePendingField();
  if (pendingField && !text.includes('ขอเพิ่ม') && !text.includes('ขอเปลี่ยน') && !text.includes('ขอใส่') && !text.includes('ขอเลือกลบ') && !text.includes('ขอข้อมูล') && !text.includes('แบบฟอร์ม')) {
    return handleSingleFieldPromptResponse(pendingField, userMessage);
  }

  // 2. ตรวจสอบการตอบคำถามรอยืนยัน (Confirmation Answer Handling)
  const pending = sessionStore.findActivePending();
  if (pending) {
    if (lowerText.includes('เปลี่ยนแปลง') || lowerText.includes('แทนที่') || lowerText.includes('เขียนทับ') || lowerText.includes('replace')) {
      return executeConfirmedUpdate(pending, 'replace');
    }
    if (lowerText.includes('เพิ่มเติม') || lowerText.includes('ต่อท้าย') || lowerText.includes('append')) {
      return executeConfirmedUpdate(pending, 'append');
    }
    if (lowerText.includes('ยกเลิก') || lowerText.includes('cancel')) {
      sessionStore.clearPending(pending.key);
      return { text: '❌ ยกเลิกการอัปเดตข้อมูลเรียบร้อยแล้วค่ะ', flexMessage: null };
    }
  }

  // 3. ใช้ Local Fallback Mode ประมวลผลคำสั่งตรง
  return handleLocalFallbackMode(userMessage);
}

// ประมวลผลเมื่อพิมพ์ค่าตอบกลับคำถามเฉพาะหัวข้อเดียว
function handleSingleFieldPromptResponse(pendingField, userMessage) {
  const { storeName, field, label, mode } = pendingField;
  sessionStore.clearPendingField(pendingField.key);

  let store;
  let flexMessage;

  // หมวดข้อมูลร้านค้า (General Info)
  if (field === 'contact_persons') {
    const parsed = parseGeneralInfoText(`ผู้ติดต่อ ${userMessage}`);
    store = db.saveGeneralInfo(storeName, parsed, mode || 'append');
    flexMessage = buildStoreGeneralInfoFlex(store);
  } else if (field === 'phone') {
    store = db.saveGeneralInfo(storeName, { phone: userMessage.trim() }, 'replace');
    flexMessage = buildStoreGeneralInfoFlex(store);
  } else if (field === 'address') {
    store = db.saveGeneralInfo(storeName, { address: userMessage.trim() }, 'replace');
    flexMessage = buildStoreGeneralInfoFlex(store);
  } else if (field === 'map_url') {
    store = db.saveGeneralInfo(storeName, { map_url: userMessage.trim() }, 'replace');
    flexMessage = buildStoreGeneralInfoFlex(store);
  } else if (field === 'delivery_by') {
    store = db.saveGeneralInfo(storeName, { delivery_by: userMessage.trim(), delivery_schedule: userMessage.trim() }, 'replace');
    flexMessage = buildStoreGeneralInfoFlex(store);
  } else if (field === 'credit_days') {
    const match = userMessage.match(/\d+/);
    const days = match ? parseInt(match[0]) : 0;
    store = db.saveGeneralInfo(storeName, { credit_days: days }, 'replace');
    flexMessage = buildStoreGeneralInfoFlex(store);
  } else if (field === 'notes') {
    store = db.saveGeneralInfo(storeName, { notes: userMessage.trim() }, 'append');
    flexMessage = buildStoreGeneralInfoFlex(store);
  }
  // หมวดข้อมูลการขาย (Sales Details)
  else if (field === 'payment_type') {
    store = db.saveSalesDetails(storeName, { payment_type: userMessage.trim() }, 'replace');
    flexMessage = buildStoreSalesDetailsFlex(store);
  } else if (field === 'brands_sold') {
    const brands = userMessage.split(/[,;\n]|และ/).map(b => b.trim()).filter(Boolean);
    store = db.saveSalesDetails(storeName, { brands_sold: brands }, 'append');
    flexMessage = buildStoreSalesDetailsFlex(store);
  } else if (field === 'last_order_date') {
    store = db.saveSalesDetails(storeName, { last_order_date: userMessage.trim() }, 'replace');
    flexMessage = buildStoreSalesDetailsFlex(store);
  } else if (field === 'last_order_amount') {
    const match = userMessage.match(/\d+/);
    const amt = match ? parseInt(match[0]) : 0;
    store = db.saveSalesDetails(storeName, { last_order_amount: amt }, 'append');
    flexMessage = buildStoreSalesDetailsFlex(store);
  } else if (field === 'ordered_items') {
    const items = userMessage.split(/[,;\n]|และ/).map(i => i.trim()).filter(Boolean);
    store = db.saveSalesDetails(storeName, { ordered_items: items }, 'append');
    flexMessage = buildStoreSalesDetailsFlex(store);
  } else if (field === 'top_selling_products') {
    const top = userMessage.split(/[,;\n]|และ/).map(t => t.trim()).filter(Boolean);
    store = db.saveSalesDetails(storeName, { top_selling_products: top }, 'append');
    flexMessage = buildStoreSalesDetailsFlex(store);
  }
  // หมวดโอกาสเสนอขาย (Sales Opportunities)
  else if (field === 'opportunity_status') {
    store = db.saveSalesOpportunities(storeName, { opportunity_status: userMessage.trim() }, 'replace');
    flexMessage = buildStoreSalesOpportunitiesFlex(store);
  } else if (field === 'recommended_products') {
    store = db.saveSalesOpportunities(storeName, { recommended_products: [userMessage.trim()] }, mode || 'append');
    flexMessage = buildStoreSalesOpportunitiesFlex(store);
  } else if (field === 'reason') {
    store = db.saveSalesOpportunities(storeName, { reason: userMessage.trim() }, 'replace');
    flexMessage = buildStoreSalesOpportunitiesFlex(store);
  } else if (field === 'target_pitch_date') {
    store = db.saveSalesOpportunities(storeName, { target_pitch_date: userMessage.trim() }, 'replace');
    flexMessage = buildStoreSalesOpportunitiesFlex(store);
  } else {
    store = db.saveGeneralInfo(storeName, { notes: userMessage.trim() }, 'append');
    flexMessage = buildStoreGeneralInfoFlex(store);
  }

  return {
    text: `✅ อัปเดตหัวข้อ [${label}] ของร้าน "${store.store_name}" เรียบร้อยแล้วค่ะ!`,
    flexMessage: flexMessage
  };
}

// ประมวลผลเมื่อเลือก "เปลี่ยนแปลง" หรือ "เพิ่มเติม"
function executeConfirmedUpdate(pending, mode) {
  const { storeName, categoryKey, parsedData } = pending;
  sessionStore.clearPending(pending.key);

  let store;
  let flexCard;
  let title = '';

  if (categoryKey === 'general_info') {
    title = 'ข้อมูลพื้นฐานร้านค้า';
    store = db.saveGeneralInfo(storeName, parsedData, mode);
    flexCard = buildStoreGeneralInfoFlex(store);
  } else if (categoryKey === 'sales_details') {
    title = 'ข้อมูลการขาย';
    store = db.saveSalesDetails(storeName, parsedData, mode);
    flexCard = buildStoreSalesDetailsFlex(store);
  } else if (categoryKey === 'sales_opportunities') {
    title = 'โอกาสเสนอขาย';
    store = db.saveSalesOpportunities(storeName, parsedData, mode);
    flexCard = buildStoreSalesOpportunitiesFlex(store);
  }

  const modeText = mode === 'replace' ? 'เปลี่ยนแปลง (เขียนทับ)' : 'เพิ่มเติม (ต่อท้าย)';

  return {
    text: `✅ บันทึกและจัดหมวดหมู่ข้อมูล [${title}] แบบ${modeText} ให้กับร้าน "${store.store_name}" เรียบร้อยแล้วค่ะ!`,
    flexMessage: flexCard
  };
}

// ตรวจสอบข้อมูลเดิมและส่งการ์ดถามยืนยัน Replace vs Append
function checkConflictAndPrompt(storeName, categoryKey, categoryTitle, parsedData, defaultSaveFn) {
  const store = db.findStoreByName(storeName);
  const oldCategory = store ? store[categoryKey] : null;

  const hasOldData = oldCategory && Object.keys(oldCategory).length > 0 && 
    Object.values(oldCategory).some(val => val !== null && val !== undefined && val !== '' && !(Array.isArray(val) && val.length === 0));

  if (hasOldData) {
    let oldSummary = '';
    let newSummary = '';

    if (categoryKey === 'general_info') {
      oldSummary = `ผู้ติดต่อ: ${oldCategory.contact_person || '-'}\nเบอร์: ${oldCategory.phone || '-'}\nที่อยู่: ${oldCategory.address || '-'}`;
      newSummary = `ผู้ติดต่อ: ${parsedData.contact_person || '-'}\nเบอร์: ${parsedData.phone || '-'}\nที่อยู่: ${parsedData.address || '-'}`;
    } else if (categoryKey === 'sales_details') {
      oldSummary = `ประเภทชำระ: ${oldCategory.payment_type || '-'}\nสั่งซื้อล่าสุด: ${oldCategory.last_order_date || '-'}\nยอดขายล่าสุด: ฿${(oldCategory.last_order_amount || 0).toLocaleString()}`;
      newSummary = `ประเภทชำระ: ${parsedData.payment_type || '-'}\nสั่งซื้อล่าสุด: ${parsedData.last_order_date || '-'}\nยอดขายล่าสุด: ฿${(parsedData.last_order_amount || 0).toLocaleString()}`;
    } else if (categoryKey === 'sales_opportunities') {
      oldSummary = `สถานะ: ${oldCategory.opportunity_status || '-'}\nสินค้าแนะนำ: ${Array.isArray(oldCategory.recommended_products) ? oldCategory.recommended_products.join(', ') : '-'}`;
      newSummary = `สถานะ: ${parsedData.opportunity_status || '-'}\nสินค้าแนะนำ: ${Array.isArray(parsedData.recommended_products) ? parsedData.recommended_products.join(', ') : '-'}`;
    }

    sessionStore.setPending('default', {
      storeName: storeName,
      categoryKey: categoryKey,
      parsedData: parsedData
    });

    const flexCard = buildConfirmationFlex(storeName, categoryTitle, oldSummary, newSummary);
    return {
      text: `⚠️ พบข้อมูล [${categoryTitle}] เดิมของร้าน "${storeName}" ในระบบ คุณต้องการ "เปลี่ยนแปลง (เขียนทับ)" หรือ "เพิ่มเติม (ต่อท้าย)" ข้อมูลคะ?`,
      flexMessage: flexCard
    };
  } else {
    const savedStore = defaultSaveFn();
    let flex;
    if (categoryKey === 'general_info') flex = buildStoreGeneralInfoFlex(savedStore);
    if (categoryKey === 'sales_details') flex = buildStoreSalesDetailsFlex(savedStore);
    if (categoryKey === 'sales_opportunities') flex = buildStoreSalesOpportunitiesFlex(savedStore);

    return {
      text: `บันทึกและจัดหมวดหมู่ข้อมูล [${categoryTitle}] ของร้าน "${savedStore.store_name}" เข้าสู่หัวข้อต่างๆ เรียบร้อยแล้วค่ะ!`,
      flexMessage: flex
    };
  }
}

function handleLocalFallbackMode(userMessage) {
  const text = userMessage.toLowerCase();

  // 🎯 1. คำสั่งกดปุ่ม 1-Tap หมวดข้อมูลพื้นฐานร้านค้า (Store Profile)
  if (text.includes('ขอเพิ่มผู้ติดต่อร้าน')) {
    const storeName = cleanStoreName(userMessage.replace(/ขอเพิ่มผู้ติดต่อร้าน/g, '').trim());
    sessionStore.setPendingField('default', { storeName, field: 'contact_persons', label: 'รายชื่อผู้ติดต่อ', mode: 'append' });
    return { text: `👥 กรุณาพิมพ์รายชื่อผู้ติดต่อใหม่ของร้าน "${storeName}" ส่งมาได้เลยค่ะ:\n*(เช่น: คุณชัย 086-777-8888)*`, flexMessage: null };
  }
  else if (text.includes('ขอเปลี่ยนเบอร์ร้าน')) {
    const storeName = cleanStoreName(userMessage.replace(/ขอเปลี่ยนเบอร์ร้าน/g, '').trim());
    sessionStore.setPendingField('default', { storeName, field: 'phone', label: 'เบอร์โทรศัพท์หลัก', mode: 'replace' });
    return { text: `📞 กรุณาพิมพ์เบอร์โทรศัพท์หลักใหม่ของร้าน "${storeName}" ส่งมาได้เลยค่ะ:\n*(เช่น: 089-999-8888)*`, flexMessage: null };
  }
  else if (text.includes('ขอเปลี่ยนที่อยู่ร้าน')) {
    const storeName = cleanStoreName(userMessage.replace(/ขอเปลี่ยนที่อยู่ร้าน/g, '').trim());
    sessionStore.setPendingField('default', { storeName, field: 'address', label: 'ที่อยู่ร้าน', mode: 'replace' });
    return { text: `📍 กรุณาพิมพ์ที่อยู่ใหม่ของร้าน "${storeName}" ส่งมาได้เลยค่ะ:\n*(เช่น: 45/6 ถ.สุขุมวิท ชลบุรี)*`, flexMessage: null };
  }
  else if (text.includes('ขอใส่แผนที่ร้าน')) {
    const storeName = cleanStoreName(userMessage.replace(/ขอใส่แผนที่ร้าน/g, '').trim());
    sessionStore.setPendingField('default', { storeName, field: 'map_url', label: 'แผนที่ร้าน', mode: 'replace' });
    return { text: `🗺️ กรุณาส่งลิงก์ Google Maps หรือ พิกัดแผนที่ร้าน "${storeName}" มาได้เลยค่ะ:\n*(เช่น: https://maps.google.com/?q=13.81,100.56)*`, flexMessage: null };
  }
  else if (text.includes('ขอเปลี่ยนจัดส่งร้าน')) {
    const storeName = cleanStoreName(userMessage.replace(/ขอเปลี่ยนจัดส่งร้าน/g, '').trim());
    sessionStore.setPendingField('default', { storeName, field: 'delivery_by', label: 'จัดส่งโดย', mode: 'replace' });
    return { text: `🚚 กรุณาพิมพ์ช่องทาง/รอบจัดส่งใหม่ของร้าน "${storeName}" ส่งมาได้เลยค่ะ:\n*(เช่น: ขนส่ง Kerry Express / รถบริษัท)*`, flexMessage: null };
  }
  else if (text.includes('ขอเปลี่ยนเครดิตร้าน')) {
    const storeName = cleanStoreName(userMessage.replace(/ขอเปลี่ยนเครดิตร้าน/g, '').trim());
    sessionStore.setPendingField('default', { storeName, field: 'credit_days', label: 'เครดิตเทอม', mode: 'replace' });
    return { text: `💳 กรุณาพิมพ์จำนวนวันเครดิตเทอมใหม่ของร้าน "${storeName}" ส่งมาได้เลยค่ะ:\n*(เช่น: 60 วัน)*`, flexMessage: null };
  }
  else if (text.includes('ขอเพิ่มโน้ตร้าน')) {
    const storeName = cleanStoreName(userMessage.replace(/ขอเพิ่มโน้ตร้าน/g, '').trim());
    sessionStore.setPendingField('default', { storeName, field: 'notes', label: 'โน้ตเพิ่มเติม', mode: 'append' });
    return { text: `📌 กรุณาพิมพ์ข้อความโน้ตเพิ่มเติมของร้าน "${storeName}" ส่งมาได้เลยค่ะ:\n*(เช่น: ให้โทรแจ้งก่อนเข้าส่ง 1 ชั่วโมง)*`, flexMessage: null };
  }

  // 🎯 2. คำสั่งกดปุ่ม 1-Tap หมวดข้อมูลการขาย (Sales Details)
  else if (text.includes('ขอเปลี่ยนประเภทชำระร้าน')) {
    const storeName = cleanStoreName(userMessage.replace(/ขอเปลี่ยนประเภทชำระร้าน/g, '').trim());
    sessionStore.setPendingField('default', { storeName, field: 'payment_type', label: 'ประเภทการชำระ', mode: 'replace' });
    return { text: `💳 กรุณาพิมพ์ประเภทการชำระเงินใหม่ของร้าน "${storeName}" ส่งมาได้เลยค่ะ:\n*(เช่น: โอนเงิน / เครดิต 30 วัน)*`, flexMessage: null };
  }
  else if (text.includes('ขอเปลี่ยนแบรนด์ร้าน')) {
    const storeName = cleanStoreName(userMessage.replace(/ขอเปลี่ยนแบรนด์ร้าน/g, '').trim());
    sessionStore.setPendingField('default', { storeName, field: 'brands_sold', label: 'แบรนด์ที่ขาย', mode: 'append' });
    return { text: `🏷️ กรุณาพิมพ์แบรนด์ที่ขายเพิ่มเติมของร้าน "${storeName}" ส่งมาได้เลยค่ะ:\n*(เช่น: Arrow, GQ)*`, flexMessage: null };
  }
  else if (text.includes('ขอเปลี่ยนวันสั่งล่าสุดร้าน')) {
    const storeName = cleanStoreName(userMessage.replace(/ขอเปลี่ยนวันสั่งล่าสุดร้าน/g, '').trim());
    sessionStore.setPendingField('default', { storeName, field: 'last_order_date', label: 'สั่งซื้อล่าสุด', mode: 'replace' });
    return { text: `📅 กรุณาพิมพ์วันที่สั่งซื้อล่าสุดใหม่ของร้าน "${storeName}" ส่งมาได้เลยค่ะ:\n*(เช่น: 10 สิงหาคม 2026)*`, flexMessage: null };
  }
  else if (text.includes('ขอเพิ่มยอดขายล่าสุดร้าน')) {
    const storeName = cleanStoreName(userMessage.replace(/ขอเพิ่มยอดขายล่าสุดร้าน/g, '').trim());
    sessionStore.setPendingField('default', { storeName, field: 'last_order_amount', label: 'ยอดขายล่าสุด', mode: 'append' });
    return { text: `💵 กรุณาพิมพ์ยอดขายล่าสุด (บาท) ของร้าน "${storeName}" ส่งมาได้เลยค่ะ:\n*(ระบบจะนำไปรวมสรุปยอดสะสมให้อัตโนมัติ)*`, flexMessage: null };
  }
  else if (text.includes('ขอเพิ่มสินค้าที่สั่งร้าน')) {
    const storeName = cleanStoreName(userMessage.replace(/ขอเพิ่มสินค้าที่สั่งร้าน/g, '').trim());
    sessionStore.setPendingField('default', { storeName, field: 'ordered_items', label: 'สินค้าที่สั่ง', mode: 'append' });
    return { text: `📦 กรุณาพิมพ์รายการสินค้าที่สั่งเพิ่มเติมของร้าน "${storeName}" ส่งมาได้เลยค่ะ:\n*(เช่น: เสื้อเชิ้ต 10 ตัว)*`, flexMessage: null };
  }
  else if (text.includes('ขอเพิ่มสินค้าขายดีร้าน')) {
    const storeName = cleanStoreName(userMessage.replace(/ขอเพิ่มสินค้าขายดีร้าน/g, '').trim());
    sessionStore.setPendingField('default', { storeName, field: 'top_selling_products', label: 'สินค้าขายดี', mode: 'append' });
    return { text: `⭐ กรุณาพิมพ์สินค้าขายดีประจำร้านเพิ่มเติมของร้าน "${storeName}" ส่งมาได้เลยค่ะ:\n*(เช่น: เสื้อเชิ้ตคอตตอน)*`, flexMessage: null };
  }

  // 🎯 3. คำสั่งกดปุ่ม 1-Tap หมวดโอกาสเสนอขาย (Sales Opportunities)
  else if (text.includes('ขอเปลี่ยนสถานะโอกาสร้าน')) {
    const storeName = cleanStoreName(userMessage.replace(/ขอเปลี่ยนสถานะโอกาสร้าน/g, '').trim());
    sessionStore.setPendingField('default', { storeName, field: 'opportunity_status', label: 'สถานะโอกาส', mode: 'replace' });
    return { text: `🎯 กรุณาพิมพ์สถานะโอกาสเสนอขายใหม่ของร้าน "${storeName}" ส่งมาได้เลยค่ะ:\n*(เช่น: 🔥 สูง / ⚡ ปานกลาง / 💤 ต่ำ)*`, flexMessage: null };
  }
  else if (text.includes('ขอเพิ่มสินค้าแนะนำร้าน')) {
    const storeName = cleanStoreName(userMessage.replace(/ขอเพิ่มสินค้าแนะนำร้าน/g, '').trim());
    sessionStore.setPendingField('default', { storeName, field: 'recommended_products', label: 'สินค้าแนะนำเสนอขาย', mode: 'append' });
    return { text: `🛍️ กรุณาพิมพ์สินค้าแนะนำเสนอขายเพิ่มเติมของร้าน "${storeName}" ส่งมาได้เลยค่ะ:\n*(เช่น: กระเป๋าเป้สะพายหลัง)*`, flexMessage: null };
  }
  else if (text.includes('ขอเลือกลบสินค้าแนะนำร้าน')) {
    const storeName = cleanStoreName(userMessage.replace(/ขอเลือกลบสินค้าแนะนำร้าน/g, '').trim());
    const store = db.findStoreByName(storeName);
    const deleteFlex = buildDeleteRecommendedProductsFlex(store);

    if (deleteFlex) {
      return {
        text: `🗑️ ดึงรายการสินค้าแนะนำเสนอขายของร้าน "${storeName}" ให้เลือกลบเรียบร้อยแล้วค่ะ:`,
        flexMessage: deleteFlex
      };
    } else {
      return {
        text: `ปัจจุบันร้าน "${storeName}" ไม่มีรายการสินค้าแนะนำเสนอขายให้ลบค่ะ`,
        flexMessage: null
      };
    }
  }
  else if (text.includes('ลบสินค้าแนะนำทั้งหมด ร้าน')) {
    const storeName = cleanStoreName(userMessage.replace(/ลบสินค้าแนะนำทั้งหมด ร้าน/g, '').trim());
    const updatedStore = db.removeRecommendedProduct(storeName, 'ALL');
    return {
      text: `✅ ลบรายการสินค้าแนะนำเสนอขายทั้งหมดของร้าน "${storeName}" เรียบร้อยแล้วค่ะ!`,
      flexMessage: buildStoreSalesOpportunitiesFlex(updatedStore)
    };
  }
  else if (text.includes('ลบสินค้าแนะนำ')) {
    const match = userMessage.match(/ลบสินค้าแนะนำ\s+(.+)\s+ร้าน(.+)/);
    if (match) {
      const item = match[1].trim();
      const storeName = cleanStoreName(match[2].trim());
      const updatedStore = db.removeRecommendedProduct(storeName, item);
      return {
        text: `✅ ลบสินค้าแนะนำ "${item}" ของร้าน "${storeName}" เรียบร้อยแล้วค่ะ!`,
        flexMessage: buildStoreSalesOpportunitiesFlex(updatedStore)
      };
    }
  }
  else if (text.includes('ขอเปลี่ยนแผนงานวันเข้าเสนอขายร้าน')) {
    const storeName = cleanStoreName(userMessage.replace(/ขอเปลี่ยนแผนงานวันเข้าเสนอขายร้าน/g, '').trim());
    sessionStore.setPendingField('default', { storeName, field: 'target_pitch_date', label: 'แผนงานวันเข้าเสนอขาย', mode: 'replace' });
    return { text: `🗓️ กรุณาพิมพ์แผนงานวันเข้าเสนอขายใหม่ของร้าน "${storeName}" ส่งมาได้เลยค่ะ:\n*(เช่น: 15 กันยายน 2026 / สัปดาห์หน้า)*`, flexMessage: null };
  }

  // C. คำสั่งดึงข้อมูลสรุปตามหมวดหมู่ (Retrieval Commands)
  if (text.includes('ขอข้อมูลการขาย') || text.includes('ขอรายละเอียดการขาย') || text.includes('ขอยอดขาย') || text.includes('ขอประวัติการสั่ง')) {
    const storeName = text.replace(/ขอข้อมูลการขาย|ขอรายละเอียดการขาย|ขอประวัติการสั่ง|ขอยอดขายร้าน|ขอยอดขาย|ยอดขายร้าน|ยอดขาย|ร้าน/g, '').trim();
    const store = db.findStoreByName(storeName);
    if (store) {
      sessionStore.setLastStore('default', store.store_name);
      return { text: `📊 ข้อมูลการขาย 7 หัวข้อหลักของร้าน "${store.store_name}" ค่ะ`, flexMessage: buildStoreSalesDetailsFlex(store) };
    } else { return { text: `ไม่พบข้อมูลการขายของร้าน "${storeName}" ค่ะ`, flexMessage: null }; }
  }
  else if (text.includes('ขอโอกาสเสนอขาย') || text.includes('ขอโอกาสขาย') || text.includes('ขอโอกาส')) {
    const storeName = text.replace(/ขอโอกาสเสนอขาย|ขอโอกาสขาย|ขอโอกาส|โอกาสเสนอขายร้าน|โอกาสขายร้าน|ร้าน/g, '').trim();
    const store = db.findStoreByName(storeName);
    if (store) {
      sessionStore.setLastStore('default', store.store_name);
      return { text: `🎯 สรุปโอกาสเสนอขายและสินค้าแนะนำ (Upsell/Cross-sell) ของร้าน "${store.store_name}" ค่ะ`, flexMessage: buildStoreSalesOpportunitiesFlex(store) };
    } else { return { text: `ไม่พบข้อมูลโอกาสเสนอขายของร้าน "${storeName}" ค่ะ`, flexMessage: null }; }
  }
  else if (text.includes('ขอข้อมูลร้าน') || text.includes('ขอข้อมูลพื้นฐาน') || text.includes('ขอข้อมูล')) {
    const storeName = text.replace(/ขอข้อมูลร้าน|ขอข้อมูลพื้นฐาน|ขอข้อมูล|ร้าน/g, '').trim();
    const store = db.findStoreByName(storeName);
    if (store) {
      sessionStore.setLastStore('default', store.store_name);
      return { text: `🏬 ข้อมูลพื้นฐานร้านค้าของ "${store.store_name}" ค่ะ`, flexMessage: buildStoreGeneralInfoFlex(store) };
    } else { return { text: `ไม่พบข้อมูลร้าน "${storeName}" ในระบบค่ะ`, flexMessage: null }; }
  }

  // A. บันทึกข้อมูลแบบระบุข้อความเต็มบรรทัด
  // A1. บันทึกโอกาสเสนอขาย
  if (text.includes('โอกาส') || text.includes('เสนอขาย') || text.includes('แนะนำ')) {
    let storeName = null;
    let rawDetails = userMessage;

    if (userMessage.includes(':')) {
      const parts = userMessage.split(':');
      storeName = parts[0].replace(/บันทึกโอกาสเสนอขาย|บันทึกโอกาส|โอกาสเสนอขายร้าน|โอกาสเสนอขาย|ร้าน/g, '').trim();
      rawDetails = parts.slice(1).join(':') || parts[0];
    }

    const parsed = parseSalesOpportunitiesText(rawDetails);
    if (!storeName && parsed.store_name) {
      storeName = parsed.store_name;
    }
    if (!storeName) {
      const firstWord = userMessage.split(/\s+/)[0];
      storeName = firstWord.replace(/บันทึกโอกาส|บันทึก|โอกาส/g, '').trim();
    }

    return checkConflictAndPrompt(storeName, 'sales_opportunities', 'โอกาสเสนอขาย', parsed, () => db.saveSalesOpportunities(storeName, parsed));
  }

  // A2. บันทึกข้อมูลการขาย
  if (text.includes('การชำระ') || text.includes('สั่งซื้อล่าสุด') || text.includes('ยอดขายล่าสุด') || text.includes('สินค้าขายดี')) {
    let storeName = null;
    let rawDetails = userMessage;

    if (userMessage.includes(':')) {
      const parts = userMessage.split(':');
      storeName = parts[0].replace(/บันทึกข้อมูลการขาย|บันทึกการขาย|ข้อมูลการขายร้าน|ข้อมูลการขาย|ร้าน/g, '').trim();
      rawDetails = parts.slice(1).join(':') || parts[0];
    }

    const parsed = parseSalesDetailsText(rawDetails);
    if (!storeName && parsed.store_name) {
      storeName = parsed.store_name;
    }
    if (!storeName) {
      const firstWord = userMessage.split(/\s+/)[0];
      storeName = firstWord.replace(/บันทึกการขาย|บันทึก/g, '').trim();
    }

    return checkConflictAndPrompt(storeName, 'sales_details', 'ข้อมูลการขาย', parsed, () => db.saveSalesDetails(storeName, parsed));
  }

  // A3. บันทึกข้อมูลพื้นฐานร้านค้า
  if (text.includes('ผู้ติดต่อ') || text.includes('เบอร์') || text.includes('โทร') || text.includes('ที่อยู่') || text.includes('แผนที่') || text.includes('จัดส่ง') || text.includes('เครดิต') || text.includes('โน้ต')) {
    let storeName = null;
    let rawDetails = userMessage;

    if (userMessage.includes(':')) {
      const parts = userMessage.split(':');
      storeName = parts[0].replace(/บันทึกข้อมูลร้าน|บันทึกร้าน|อัปเดตข้อมูลร้าน/g, '').trim();
      rawDetails = parts.slice(1).join(':') || parts[0];
    }

    const parsed = parseGeneralInfoText(rawDetails);
    if (!storeName && parsed.store_name) {
      storeName = parsed.store_name;
    }
    if (!storeName) {
      const firstWord = userMessage.split(/\s+/)[0];
      storeName = firstWord.replace(/บันทึกร้าน|บันทึก/g, '').trim();
    }

    return checkConflictAndPrompt(storeName, 'general_info', 'ข้อมูลพื้นฐานร้านค้า', parsed, () => db.saveGeneralInfo(storeName, parsed));
  }

  // B. คำสั่งขอคู่มือ / แบบฟอร์มป้อนข้อมูล (Form Guide & Help)
  if (text.includes('ขอฟอร์มข้อมูลร้านค้า') || text.includes('ฟอร์มข้อมูลร้านค้า') || text.includes('ฟอร์มร้านค้า')) {
    return {
      text: '🏬 นี่คือรูปแบบและตัวอย่างการป้อน [ข้อมูลพื้นฐานร้านค้า 7 หัวข้อ] ค่ะ:',
      flexMessage: buildFormGuideFlex('general_info')
    };
  }
  if (text.includes('ขอฟอร์มข้อมูลการขาย') || text.includes('ฟอร์มข้อมูลการขาย') || text.includes('ฟอร์มการขาย')) {
    return {
      text: '📊 นี่คือรูปแบบและตัวอย่างการป้อน [ข้อมูลการขาย 7 หัวข้อ] ค่ะ:',
      flexMessage: buildFormGuideFlex('sales_details')
    };
  }
  if (text.includes('ขอฟอร์มโอกาสเสนอขาย') || text.includes('ฟอร์มโอกาสเสนอขาย') || text.includes('ฟอร์มโอกาส')) {
    return {
      text: '🎯 นี่คือรูปแบบและตัวอย่างการป้อน [โอกาสเสนอขาย] ค่ะ:',
      flexMessage: buildFormGuideFlex('sales_opportunities')
    };
  }
  if (text.includes('วิธีบันทึก') || text.includes('ป้อนข้อมูลยังไง') || text.includes('สั่งยังไง') || text.includes('บันทึกยังไง') || text.includes('แบบฟอร์ม') || text.includes('คู่มือ') || text.includes('ฟอร์มป้อนข้อมูล')) {
    return {
      text: '📝 คุณสามารถเลือกหมวดหมู่ที่ต้องการขอคำแนะนำการบันทึกข้อมูลได้ด้านล่างค่ะ:',
      flexMessage: buildCategoryMenuFlex()
    };
  }

  return {
    text: `สวัสดีค่ะ! SalesAI Assistant พร้อมดูแลและสรุปข้อมูล 3 หมวดหลักดังนี้ค่ะ:\n1. 🏬 **ข้อมูลพื้นฐานร้านค้า:** "ขอข้อมูลร้านสมศักดิ์"\n2. 📊 **ข้อมูลการขาย:** "ขอข้อมูลการขายร้านสมศักดิ์"\n3. 🎯 **โอกาสเสนอขาย:** "ขอข้อมูลโอกาสเสนอขายร้านสมศักดิ์"\n\n💡 หากต้องการขอตัวอย่างฟอร์มป้อนข้อมูล พิมพ์ **"แบบฟอร์ม"** ได้ตลอดเวลาค่ะ`,
    flexMessage: null
  };
}
