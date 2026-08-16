import { config } from '../config.js';
import { db, cleanStoreName } from '../database/db.js';
import { sessionStore } from './sessionStore.js';
import { syncWhitelistToGitHub } from './githubService.js';
import { 
  parseGeneralInfoText, 
  parseSalesDetailsText, 
  parseSalesOpportunitiesText,
  parseAllStoreCategories
} from '../utils/textParser.js';
import { 
  getGeneralInfoDeclaration, saveGeneralInfoDeclaration,
  getSalesDetailsDeclaration, saveSalesDetailsDeclaration,
  getSalesOpportunitiesDeclaration, saveSalesOpportunitiesDeclaration
} from '../tools/storeTool.js';
import { 
  buildProductCarouselFlex,
  buildStoreGeneralInfoFlex,
  buildStoreSalesDetailsFlex,
  buildStoreSalesOpportunitiesFlex,
  buildAll3CategoryFlexCards,
  buildAllStoresListFlex,
  buildProvinceGroupFlex,
  buildDistrictGroupFlex,
  buildFilteredStoresListFlex,
  parseAddressLocation,
  buildDeleteRecommendedProductsFlex,
  buildConfirmationFlex,
  buildCategoryMenuFlex,
  buildFormGuideFlex,
  buildWizardPromptFlex,
  buildMasterSystemOverviewFlex,
  buildWhitelistStatusFlex,
  buildBrandOrderedItemsFlex,
  getMatchingBrand
} from './lineFormatter.js';

const SYSTEM_INSTRUCTION = `คุณคือ "SalesAI Assistant" ผู้ช่วยพนักงานขายอัจฉริยะในไลน์
หน้าที่ของคุณคือช่วยงานพนักงานขายโดยนำข้อมูลที่ได้รับไปจำแนกใส่ลงใน 3 หมวดหมู่หลัก:
1. "ข้อมูลร้านค้า": บันทึก/ดึงข้อมูลพื้นฐานร้านค้า (ผู้ติดต่อ, เบอร์โทรศัพท์หลัก, ที่อยู่ร้าน, แผนที่ร้าน, จัดส่งโดย, เครดิตเทอม, โน้ตเพิ่มเติม) (ใช้ get_store_general_info / save_store_general_info)
2. "ข้อมูลการขาย": บันทึก/ดึงข้อมูลการขาย (ประเภทการชำระ, แบรนด์ที่ขาย, สั่งซื้อล่าสุด, ยอดขายล่าสุด, ยอดขายสะสม เดือน/ปี, ยอดขายรายปี, สินค้าที่สั่ง, สินค้าขายดี) (ใช้ get_store_sales_details / save_store_sales_details)
3. "โอกาสเสนอขาย": บันทึก/ดึงโอกาสเสนอขาย (สถานะโอกาส, สินค้าแนะนำ, เหตุผล, แผนงานวันเข้าเสนอขาย) (ใช้ get_store_sales_opportunities / save_store_sales_opportunities)`;

export async function processUserMessage(userMessage, contextId = 'default', userId = null) {
  const text = (userMessage || '').trim();
  const lowerText = text.toLowerCase();

  // 0. ตรวจสอบสิทธิ์การใช้งาน (Security Whitelist Check)
  const isAllowed = db.isContextAllowed(contextId, userId);

  // คำสั่งแอดมินลงทะเบียนสิทธิ์ (เฉพาะเครื่องหลัก Master Admin เท่านั้น)
  if (text.includes('ลงทะเบียนสิทธิ์กลุ่ม') || text.includes('ลงทะเบียนกลุ่ม') || text.includes('อนุมัติกลุ่ม')) {
    if (!db.isMasterAdmin(userId, contextId)) {
      return {
        text: `⛔ ขออภัยค่ะ คำสั่งลงทะเบียนอนุมัติสิทธิ์กลุ่มแชต สามารถทำได้โดยเครื่องผู้ดูแลระบบหลัก (Master Admin) เท่านั้นค่ะ`,
        flexMessage: null
      };
    }

    let targetGroup = contextId;
    let groupName = null;

    const rawInput = userMessage.replace(/ลงทะเบียนสิทธิ์กลุ่มนี้|ลงทะเบียนสิทธิ์กลุ่ม|ลงทะเบียนกลุ่มนี้|ลงทะเบียนกลุ่ม|อนุมัติกลุ่มนี้|อนุมัติกลุ่ม/gi, '').trim();
    if (rawInput) {
      const parts = rawInput.split(/\s+/);
      if (parts[0].startsWith('C') || parts[0].startsWith('R')) {
        targetGroup = parts[0];
        if (parts[1]) groupName = parts.slice(1).join(' ');
      } else {
        groupName = rawInput;
      }
    }

    db.addAllowedContext(targetGroup, 'group', groupName);
    syncWhitelistToGitHub().catch(() => {});

    const friendlyLabel = groupName ? `กลุ่ม "${groupName}"` : db.getFriendlyName(targetGroup);

    return {
      text: `🔒 [Master Admin Approved]: ลงทะเบียนอนุมัติสิทธิ์การใช้งานของ ${friendlyLabel} เรียบร้อยแล้วค่ะ!`,
      flexMessage: null
    };
  }
  if (text.includes('ลงทะเบียนสิทธิ์ผู้ใช้') || text.includes('ลงทะเบียนผู้ใช้') || text.includes('อนุมัติผู้ใช้')) {
    if (!db.isMasterAdmin(userId, contextId)) {
      return {
        text: `⛔ ขออภัยค่ะ คำสั่งลงทะเบียนอนุมัติสิทธิ์ผู้ใช้งาน สามารถทำได้โดยเครื่องผู้ดูแลระบบหลัก (Master Admin) เท่านั้นค่ะ`,
        flexMessage: null
      };
    }
    let targetUser = (userId || contextId);
    let userName = null;
    const rawInput = userMessage.replace(/ลงทะเบียนสิทธิ์ผู้ใช้|ลงทะเบียนผู้ใช้|อนุมัติผู้ใช้/gi, '').trim();
    if (rawInput) {
      const parts = rawInput.split(/\s+/);
      if (parts[0].startsWith('U')) {
        targetUser = parts[0];
        if (parts[1]) userName = parts.slice(1).join(' ');
      } else {
        userName = rawInput;
      }
    }
    db.addAllowedContext(targetUser, 'user', userName);
    syncWhitelistToGitHub().catch(() => {});

    const friendlyLabel = userName ? `ผู้ใช้งาน "${userName}"` : db.getFriendlyName(targetUser);

    return {
      text: `🔒 [Master Admin Approved]: ลงทะเบียนอนุมัติสิทธิ์ผู้ใช้งาน ${friendlyLabel} เรียบร้อยแล้วค่ะ!`,
      flexMessage: null
    };
  }
  if (text.includes('ยกเลิกสิทธิ์กลุ่ม') || text.includes('ยกเลิกสิทธิ์ผู้ใช้')) {
    if (!db.isMasterAdmin(userId, contextId)) {
      return {
        text: `⛔ ขออภัยค่ะ คำสั่งยกเลิกสิทธิ์ สามารถทำได้โดยเครื่องผู้ดูแลระบบหลัก (Master Admin) เท่านั้นค่ะ`,
        flexMessage: null
      };
    }
    const targetId = userMessage.replace(/ยกเลิกสิทธิ์กลุ่ม|ยกเลิกสิทธิ์ผู้ใช้/gi, '').trim() || contextId;
    const friendlyLabel = db.getFriendlyName(targetId);
    db.removeAllowedContext(targetId);
    syncWhitelistToGitHub().catch(() => {});
    return {
      text: `🔒 [Master Admin Action]: ยกเลิกสิทธิ์การใช้งานของ (${friendlyLabel}) เรียบร้อยแล้วค่ะ!`,
      flexMessage: null
    };
  }
  if (text.includes('ตั้งชื่อไลน์') || text.includes('ตั้งชื่อสิทธิ์') || text.includes('ตั้งชื่อโปรไฟล์')) {
    if (!db.isMasterAdmin(userId, contextId)) {
      return {
        text: `⛔ ขออภัยค่ะ คำสั่งตั้งชื่อแสดงผลสิทธิ์ สามารถทำได้โดยเครื่องผู้ดูแลระบบหลัก (Master Admin) เท่านั้นค่ะ`,
        flexMessage: null
      };
    }
    const rawInput = userMessage.replace(/ตั้งชื่อไลน์|ตั้งชื่อสิทธิ์|ตั้งชื่อโปรไฟล์/gi, '').trim();
    const parts = rawInput.split(/\s+/);
    if (parts.length >= 2) {
      const targetId = parts[0];
      const customName = parts.slice(1).join(' ');
      const type = (targetId.startsWith('C') || targetId.startsWith('R')) ? 'group' : 'user';
      db.saveProfileName(targetId, type, customName);
      syncWhitelistToGitHub().catch(() => {});
      return {
        text: `✏️ [Master Admin Action]: อัปเดตตั้งชื่อแสดงผลของ (${targetId}) เป็น "${customName}" เรียบร้อยแล้วค่ะ!`,
        flexMessage: null
      };
    } else if (rawInput) {
      const target = (userId && contextId === userId) ? userId : contextId;
      const type = (target.startsWith('C') || target.startsWith('R')) ? 'group' : 'user';
      db.saveProfileName(target, type, rawInput);
      syncWhitelistToGitHub().catch(() => {});
      return {
        text: `✏️ [Master Admin Action]: อัปเดตตั้งชื่อแสดงผลของแชตนี้เป็น "${rawInput}" เรียบร้อยแล้วค่ะ!`,
        flexMessage: null
      };
    }
  }
  if (text.includes('เช็คสิทธิ์') || text.includes('ดูสิทธิ์') || text.includes('สถานะสิทธิ์')) {
    const wl = db.getWhitelist();
    const cleanUsers = (wl.allowed_users || []).filter(u => u !== 'default');
    const cleanGroups = (wl.allowed_groups || []).filter(g => g !== 'default');

    const usersList = cleanUsers.length > 0
      ? cleanUsers.map((u, i) => {
          const isMaster = db.isMasterAdmin(u, u);
          const icon = isMaster ? '👑' : '👤';
          return `  ${i + 1}. ${icon} ${db.getFriendlyName(u)}`;
        }).join('\n')
      : '  (ยังไม่มีผู้ใช้เพิ่มเติม)';

    const groupsList = cleanGroups.length > 0
      ? cleanGroups.map((g, i) => `  ${i + 1}. 👥 ${db.getFriendlyName(g)}`).join('\n')
      : '  (ยังไม่มีกลุ่มแชตเพิ่มเติม)';

    const isCurrentMaster = db.isMasterAdmin(userId, contextId);
    const currentIcon = isCurrentMaster ? '👑' : ((contextId.startsWith('C') || contextId.startsWith('R')) ? '👥' : '👤');
    const currentCtxLabel = `${currentIcon} ${db.getFriendlyName(contextId)}`;
    const flexCard = buildWhitelistStatusFlex(wl, currentCtxLabel, isAllowed);

    return {
      text: `🛡️ รายการสิทธิ์ที่ได้รับอนุมัติในระบบ (Whitelist Status):\n\n👑 เครื่องผู้ดูแลหลัก (Master Admin - 2 เครื่อง):\n  • 👑 ผู้ดูแลระบบหลัก (Master Admin เครื่องที่ 1)\n  • 👑 ผู้ดูแลระบบหลัก (Master Admin เครื่องที่ 2)\n\n👤 ผู้ใช้ส่วนตัวที่ได้รับอนุมัติ (${cleanUsers.length} คน):\n${usersList}\n\n👥 กลุ่มแชตไลน์ที่ได้รับอนุมัติ (${cleanGroups.length} กลุ่ม):\n${groupsList}\n\n📌 แชตปัจจุบัน (${currentCtxLabel}): ${isAllowed ? '✅ ได้รับอนุมัติสิทธิ์แล้ว' : '❌ ยังไม่ได้รับสิทธิ์'}`,
      flexMessage: flexCard
    };
  }

  // หากไม่มีสิทธิ์ใช้งาน (Unregistered Outsider) -> ไม่ตอบกลับ (Silent Rejection / Ignore)
  if (!isAllowed) {
    console.log(`[Security Whitelist Rejected]: Context (${contextId}) / User (${userId}) is not registered.`);
    return null;
  }

  // 1. ตรวจสอบสถานะรอรับค่าเฉพาะหัวข้อเดียว (1-Field Prompt Response Handling)
  const pendingField = sessionStore.findActivePendingField(contextId);
  if (pendingField && !text.includes('ขอเพิ่ม') && !text.includes('ขอเปลี่ยน') && !text.includes('ขอใส่') && !text.includes('ขอเลือกลบ') && !text.includes('ขอข้อมูล') && !text.includes('แบบฟอร์ม') && !text.includes('จบการบันทึก') && !text.includes('เสร็จสิ้นการบันทึก') && !text.includes('เลิกบันทึก')) {
    return handleSingleFieldPromptResponse(pendingField, userMessage, contextId);
  }

  // 2. ตรวจสอบการตอบคำถามรอยืนยัน (Confirmation Answer Handling)
  const pending = sessionStore.findActivePending(contextId);
  if (pending) {
    if (lowerText.includes('เปลี่ยนแปลง') || lowerText.includes('แทนที่') || lowerText.includes('เขียนทับ') || lowerText.includes('replace')) {
      return executeConfirmedUpdate(pending, 'replace', contextId);
    }
    if (lowerText.includes('เพิ่มเติม') || lowerText.includes('ต่อท้าย') || lowerText.includes('append')) {
      return executeConfirmedUpdate(pending, 'append', contextId);
    }
    if (lowerText.includes('ยกเลิก') || lowerText.includes('cancel')) {
      sessionStore.clearPending(contextId);
      return { text: '❌ ยกเลิกการอัปเดตข้อมูลเรียบร้อยแล้วค่ะ', flexMessage: null };
    }
  }

  // 3. ใช้ Local Fallback Mode ประมวลผลคำสั่งตรง
  return handleLocalFallbackMode(userMessage, contextId, userId);
}

// ประมวลผลเมื่อพิมพ์ค่าตอบกลับคำถามเฉพาะหัวข้อเดียว
function handleSingleFieldPromptResponse(pendingField, userMessage, contextId = 'default') {
  const { storeName, field, label, mode } = pendingField;
  sessionStore.clearPendingField(contextId);

  const activeSession = sessionStore.getActiveStoreSession(contextId);
  const isRecordingSession = activeSession && activeSession.isRecording;

  let store;
  let flexMessage;

  // หมวดข้อมูลร้านค้า (General Info)
  if (field === 'contact_persons') {
    const parsed = parseGeneralInfoText(`ผู้ติดต่อ ${userMessage}`);
    store = db.saveGeneralInfo(storeName, parsed, mode || 'append', contextId);
    flexMessage = isRecordingSession ? buildAll3CategoryFlexCards(store, true) : buildStoreGeneralInfoFlex(store, false, contextId);
  } else if (field === 'phone') {
    const parsed = parseGeneralInfoText(`เบอร์ ${userMessage}`);
    const newPhones = (parsed.phones && parsed.phones.length > 0)
      ? parsed.phones
      : (userMessage.includes(',') || userMessage.includes('\n') ? userMessage.split(/[,;\n]|และ/).map(s => s.trim()).filter(Boolean) : [userMessage.trim()]);
    store = db.saveGeneralInfo(storeName, { phone: newPhones.join(', '), phones: newPhones }, mode || 'append', contextId);
    flexMessage = isRecordingSession ? buildAll3CategoryFlexCards(store, true) : buildStoreGeneralInfoFlex(store, false, contextId);
  } else if (field === 'address') {
    store = db.saveGeneralInfo(storeName, { address: userMessage.trim() }, 'replace', contextId);
    flexMessage = isRecordingSession ? buildAll3CategoryFlexCards(store, true) : buildStoreGeneralInfoFlex(store, false, contextId);
  } else if (field === 'map_url') {
    store = db.saveGeneralInfo(storeName, { map_url: userMessage.trim() }, 'replace', contextId);
    flexMessage = isRecordingSession ? buildAll3CategoryFlexCards(store, true) : buildStoreGeneralInfoFlex(store, false, contextId);
  } else if (field === 'delivery_by') {
    store = db.saveGeneralInfo(storeName, { delivery_by: userMessage.trim(), delivery_schedule: userMessage.trim() }, 'replace', contextId);
    flexMessage = isRecordingSession ? buildAll3CategoryFlexCards(store, true) : buildStoreGeneralInfoFlex(store, false, contextId);
  } else if (field === 'credit_days') {
    const match = userMessage.match(/\d+/);
    const days = match ? parseInt(match[0]) : 0;
    store = db.saveGeneralInfo(storeName, { credit_days: days }, 'replace', contextId);
    flexMessage = isRecordingSession ? buildAll3CategoryFlexCards(store, true) : buildStoreGeneralInfoFlex(store, false, contextId);
  } else if (field === 'notes') {
    store = db.saveGeneralInfo(storeName, { notes: userMessage.trim() }, 'append', contextId);
    flexMessage = isRecordingSession ? buildAll3CategoryFlexCards(store, true) : buildStoreGeneralInfoFlex(store, false, contextId);
  } else if (field === 'line_contact') {
    const rawInput = userMessage.trim();
    let lineUrl = rawInput;
    if (rawInput.startsWith('@')) {
      lineUrl = `https://line.me/R/ti/p/~${rawInput}`;
    } else if (rawInput.match(/^[a-zA-Z0-9_\-\.]+$/)) {
      lineUrl = `https://line.me/R/ti/p/~${rawInput}`;
    }
    store = db.saveGeneralInfo(storeName, { line_contact: lineUrl, line_contacts: [lineUrl] }, 'append', contextId);
    flexMessage = isRecordingSession ? buildAll3CategoryFlexCards(store, true) : buildStoreGeneralInfoFlex(store, false, contextId);
  }
  // หมวดข้อมูลการขาย (Sales Details)
  else if (field === 'payment_type') {
    store = db.saveSalesDetails(storeName, { payment_type: userMessage.trim() }, 'replace', contextId);
    flexMessage = isRecordingSession ? buildAll3CategoryFlexCards(store, true) : buildStoreSalesDetailsFlex(store, false, contextId);
  } else if (field === 'brands_sold') {
    const brands = userMessage.split(/[,;\n]|และ/).map(b => b.trim()).filter(Boolean);
    store = db.saveSalesDetails(storeName, { brands_sold: brands }, 'append', contextId);
    flexMessage = isRecordingSession ? buildAll3CategoryFlexCards(store, true) : buildStoreSalesDetailsFlex(store, false, contextId);
  } else if (field === 'last_order_date') {
    store = db.saveSalesDetails(storeName, { last_order_date: userMessage.trim() }, 'replace', contextId);
    flexMessage = isRecordingSession ? buildAll3CategoryFlexCards(store, true) : buildStoreSalesDetailsFlex(store, false, contextId);
  } else if (field === 'last_order_amount') {
    const match = userMessage.match(/\d+/);
    const amt = match ? parseInt(match[0]) : 0;
    store = db.saveSalesDetails(storeName, { last_order_amount: amt }, 'append', contextId);
    flexMessage = isRecordingSession ? buildAll3CategoryFlexCards(store, true) : buildStoreSalesDetailsFlex(store, false, contextId);
  } else if (field === 'ordered_items') {
    const items = userMessage.split(/[,;\n]|และ/).map(i => i.trim()).filter(Boolean);
    store = db.saveSalesDetails(storeName, { ordered_items: items }, 'append', contextId);
    flexMessage = isRecordingSession ? buildAll3CategoryFlexCards(store, true) : buildStoreSalesDetailsFlex(store, false, contextId);
  } else if (field === 'top_selling_products') {
    const top = userMessage.split(/[,;\n]|และ/).map(t => t.trim()).filter(Boolean);
    store = db.saveSalesDetails(storeName, { top_selling_products: top }, 'append', contextId);
    flexMessage = isRecordingSession ? buildAll3CategoryFlexCards(store, true) : buildStoreSalesDetailsFlex(store, false, contextId);
  }
  // หมวดโอกาสเสนอขาย (Sales Opportunities)
  else if (field === 'opportunity_status') {
    store = db.saveSalesOpportunities(storeName, { opportunity_status: userMessage.trim() }, 'replace', contextId);
    flexMessage = isRecordingSession ? buildAll3CategoryFlexCards(store, true) : buildStoreSalesOpportunitiesFlex(store, false, contextId);
  } else if (field === 'recommended_products') {
    store = db.saveSalesOpportunities(storeName, { recommended_products: [userMessage.trim()] }, mode || 'append', contextId);
    flexMessage = isRecordingSession ? buildAll3CategoryFlexCards(store, true) : buildStoreSalesOpportunitiesFlex(store, false, contextId);
  } else if (field === 'reason') {
    store = db.saveSalesOpportunities(storeName, { reason: userMessage.trim() }, 'replace', contextId);
    flexMessage = isRecordingSession ? buildAll3CategoryFlexCards(store, true) : buildStoreSalesOpportunitiesFlex(store, false, contextId);
  } else if (field === 'target_pitch_date') {
    store = db.saveSalesOpportunities(storeName, { target_pitch_date: userMessage.trim() }, 'replace', contextId);
    flexMessage = isRecordingSession ? buildAll3CategoryFlexCards(store, true) : buildStoreSalesOpportunitiesFlex(store, false, contextId);
  } else {
    store = db.saveGeneralInfo(storeName, { notes: userMessage.trim() }, 'append', contextId);
    flexMessage = isRecordingSession ? buildAll3CategoryFlexCards(store, true) : buildStoreGeneralInfoFlex(store, isRecordingSession, contextId);
  }

  const sessionNotice = isRecordingSession ? ' (ยังอยู่ในโหมดบันทึกข้อมูลร้านนี้ กดปุ่ม [✅ จบการบันทึกข้อมูลพื้นฐานร้านค้า] เมื่อบันทึกเสร็จนะคะ)' : '';

  return {
    text: `✅ อัปเดตหัวข้อ [${label}] ของร้าน "${store.store_name}" เรียบร้อยแล้วค่ะ!${sessionNotice}`,
    flexMessage: flexMessage
  };
}

// ประมวลผลเมื่อเลือก "เปลี่ยนแปลง" หรือ "เพิ่มเติม"
function executeConfirmedUpdate(pending, mode, contextId = 'default') {
  const { storeName, categoryKey, parsedData } = pending;
  sessionStore.clearPending(contextId);

  const activeSession = sessionStore.getActiveStoreSession(contextId);
  const isRecording = activeSession && activeSession.isRecording;

  let store;
  let flexCard;
  let title = '';

  if (categoryKey === 'general_info') {
    title = 'ข้อมูลพื้นฐานร้านค้า';
    store = db.saveGeneralInfo(storeName, parsedData, mode, contextId);
    flexCard = isRecording ? buildAll3CategoryFlexCards(store, true) : buildStoreGeneralInfoFlex(store, isRecording);
  } else if (categoryKey === 'sales_details') {
    title = 'ข้อมูลการขาย';
    store = db.saveSalesDetails(storeName, parsedData, mode, contextId);
    flexCard = isRecording ? buildAll3CategoryFlexCards(store, true) : buildStoreSalesDetailsFlex(store);
  } else if (categoryKey === 'sales_opportunities') {
    title = 'โอกาสเสนอขาย';
    store = db.saveSalesOpportunities(storeName, parsedData, mode, contextId);
    flexCard = isRecording ? buildAll3CategoryFlexCards(store, true) : buildStoreSalesOpportunitiesFlex(store);
  }

  const modeText = mode === 'replace' ? 'เปลี่ยนแปลง (เขียนทับ)' : 'เพิ่มเติม (ต่อท้าย)';

  return {
    text: `✅ บันทึกและจัดหมวดหมู่ข้อมูล [${title}] แบบ${modeText} ให้กับร้าน "${store.store_name}" เรียบร้อยแล้วค่ะ!`,
    flexMessage: flexCard
  };
}

// ตรวจสอบข้อมูลเดิมและส่งการ์ดถามยืนยัน Replace vs Append
function checkConflictAndPrompt(storeName, categoryKey, categoryTitle, parsedData, defaultSaveFn, contextId = 'default') {
  const store = db.findStoreByName(storeName, contextId);
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

    sessionStore.setPending(contextId, {
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
    const activeSession = sessionStore.getActiveStoreSession(contextId);
    const isRecording = activeSession && activeSession.isRecording;

    let flex;
    if (categoryKey === 'general_info') flex = buildStoreGeneralInfoFlex(savedStore, isRecording, contextId);
    if (categoryKey === 'sales_details') flex = buildStoreSalesDetailsFlex(savedStore, false, contextId);
    if (categoryKey === 'sales_opportunities') flex = buildStoreSalesOpportunitiesFlex(savedStore, false, contextId);

    return {
      text: `บันทึกและจัดหมวดหมู่ข้อมูล [${categoryTitle}] ของร้าน "${savedStore.store_name}" เข้าสู่หัวข้อต่างๆ เรียบร้อยแล้วค่ะ!`,
      flexMessage: flex
    };
  }
}

function handleLocalFallbackMode(userMessage, contextId = 'default', userId = null) {
  const text = userMessage.toLowerCase();

  // 🎯 0. คำสั่งจบการบันทึกข้อมูลพื้นฐานร้านค้า (End Store Recording Session)
  if (text.includes('จบการบันทึก') || text.includes('เสร็จสิ้นการบันทึก') || text.includes('เลิกบันทึก')) {
    const activeSession = sessionStore.getActiveStoreSession(contextId);
    const rawTarget = userMessage.replace(/จบการบันทึกข้อมูลร้าน|จบการบันทึกข้อมูล|จบการบันทึก|เสร็จสิ้นการบันทึก|เลิกบันทึก/g, '').trim();
    const targetStoreName = activeSession ? activeSession.storeName : (cleanStoreName(rawTarget) || sessionStore.getLastStore(contextId) || 'ร้านค้า');

    sessionStore.clearActiveStoreSession(contextId);
    sessionStore.clearPendingField(contextId);
    sessionStore.clearPending(contextId);
    const store = db.findStoreByName(targetStoreName, contextId) || { store_name: targetStoreName };
    const displayStoreName = store.store_name || targetStoreName || 'ร้านค้า';

    return {
      text: `✅ จบการบันทึกข้อมูลพื้นฐานร้านค้า "${displayStoreName}" เรียบร้อยแล้วค่ะ ข้อมูลถูกจัดเก็บสมบูรณ์ในระบบแล้วค่ะ!`,
      flexMessage: buildStoreGeneralInfoFlex(store, false, contextId)
    };
  }

  // 🎯 0.1 คำสั่งเริ่มบันทึกข้อมูลพื้นฐานร้านค้าใหม่ (Start Store Recording Session or Save Full General Info)
  if ((text.includes('บันทึกข้อมูล') || text.includes('ขอลงทะเบียนร้าน') || text.includes('เพิ่มร้าน')) && !text.includes('การขาย') && !text.includes('โอกาส') && !text.includes('สินค้า')) {
    const parsed = parseGeneralInfoText(userMessage);
    
    let rawStore = userMessage.replace(/ขอแบบฟอร์มบันทึกข้อมูล|บันทึกข้อมูลร้าน|บันทึกข้อมูล|ขอลงทะเบียนร้านค้า|ขอลงทะเบียนร้าน|เพิ่มร้านใหม่|เพิ่มร้าน/g, '').trim();
    if (rawStore.startsWith('ร้าน')) {
      rawStore = rawStore.replace(/^ร้าน\s*/, '').trim();
    }
    
    let storeName = parsed.store_name || rawStore.split(/[\s,:\n]/)[0].trim();
    storeName = cleanStoreName(storeName);

    if (!storeName || storeName === 'ใหม่') {
      return {
        text: `📝 กรุณาระบุ "ชื่อร้านค้า" ที่ต้องการเริ่มบันทึกข้อมูลพื้นฐานค่ะ:\n*(เช่น พิมพ์สั่ง: บันทึกข้อมูล ร้านมิตรภาพการค้า)*`,
        flexMessage: null
      };
    }

    sessionStore.setActiveStoreSession(contextId, storeName);
    const savedStore = db.saveGeneralInfo(storeName, parsed, 'append', contextId);

    return {
      text: `🔄 เริ่มโหมดบันทึกข้อมูลร้านค้า "${storeName}" เรียบร้อยแล้วค่ะ!\n\nระบบจัดเตรียมแบบฟอร์มการ์ดครบทั้ง 3 หมวดหลัก (1. ข้อมูลพื้นฐานร้านค้า, 2. ข้อมูลการขาย, 3. โอกาสเสนอขาย) ให้คุณเลือกกดปุ่ม 1-Tap หรือพิมพ์ป้อนข้อมูลต่อได้ทันทีค่ะ!`,
      flexMessage: [
        buildStoreGeneralInfoFlex(savedStore, true, contextId),
        buildStoreSalesDetailsFlex(savedStore, false, contextId),
        buildStoreSalesOpportunitiesFlex(savedStore, false, contextId)
      ]
    };
  }

  // 🎯 0.2 หากกำลังอยู่ในโหมดบันทึกข้อมูลพื้นฐานร้านค้าค้างอยู่ (Active Store Recording Session Fallback)
  const activeSession = sessionStore.getActiveStoreSession(contextId);
  if (activeSession && activeSession.isRecording && !text.includes('จบการบันทึก') && !text.includes('แสดงรายชื่อ') && !text.includes('รายชื่อ') && !text.includes('ขอข้อมูล') && !text.includes('ขอรายละเอียด') && !text.includes('แบบฟอร์ม') && !text.includes('การขาย') && !text.includes('โอกาส') && !text.includes('ขอเพิ่ม') && !text.includes('ขอเปลี่ยน') && !text.includes('ขอใส่')) {
    const storeName = activeSession.storeName;
    const parsed = parseGeneralInfoText(userMessage);
    const updatedStore = db.saveGeneralInfo(storeName, parsed, 'append', contextId);
    return {
      text: `✅ บันทึกข้อมูลเพิ่มลงในร้าน "${storeName}" เรียบร้อยแล้วค่ะ!\n*(ยังอยู่ในโหมดบันทึกข้อมูลร้านนี้ สามารถเลือกใส่ข้อมูลในการ์ดใดก็ได้ หรือกดปุ่ม [✅ จบการบันทึกข้อมูลร้านค้า] บนการ์ดใดก็ได้เมื่อเสร็จสิ้นนะคะ)*`,
      flexMessage: buildAll3CategoryFlexCards(updatedStore, true)
    };
  }

  // 🎯 1. คำสั่งกดปุ่ม 1-Tap หมวดข้อมูลพื้นฐานร้านค้า (Store Profile)
  if (text.includes('ขอเพิ่มผู้ติดต่อร้าน')) {
    const storeName = cleanStoreName(userMessage.replace(/ขอเพิ่มผู้ติดต่อร้าน/g, '').trim());
    sessionStore.setPendingField(contextId, { storeName, field: 'contact_persons', label: 'รายชื่อผู้ติดต่อ', mode: 'append' });
    return { text: `👥 กรุณาพิมพ์รายชื่อผู้ติดต่อใหม่ของร้าน "${storeName}" ส่งมาได้เลยค่ะ:\n*(เช่น: คุณชัย 086-777-8888)*`, flexMessage: null };
  }
  else if (text.includes('ขอเพิ่มเบอร์ร้าน')) {
    const storeName = cleanStoreName(userMessage.replace(/ขอเพิ่มเบอร์ร้าน/g, '').trim());
    sessionStore.setPendingField(contextId, { storeName, field: 'phone', label: 'เบอร์โทรศัพท์', mode: 'append' });
    return { text: `📞 กรุณาพิมพ์เบอร์โทรศัพท์เพิ่มเติมของร้าน "${storeName}" ส่งมาได้เลยค่ะ (สามารถพิมพ์เพิ่มหลายเบอร์ได้ เช่น เบอร์ร้าน 053298851, เบอร์มือถือ 0946930597):\n*(สามารถใส่ข้อความนำหน้าภาษาไทย/อังกฤษคู่กับเบอร์โทรได้)*`, flexMessage: null };
  }
  else if (text.includes('ขอเปลี่ยนเบอร์ร้าน')) {
    const storeName = cleanStoreName(userMessage.replace(/ขอเปลี่ยนเบอร์ร้าน/g, '').trim());
    sessionStore.setPendingField(contextId, { storeName, field: 'phone', label: 'เบอร์โทรศัพท์', mode: 'replace' });
    return { text: `✏️ กรุณาพิมพ์เบอร์โทรศัพท์ใหม่ที่จะใช้แทนที่เบอร์เดิมของร้าน "${storeName}" ส่งมาได้เลยค่ะ:\n*(เช่น: เบอร์ร้าน 053298851, เบอร์มือถือร้าน 0946930597)*`, flexMessage: null };
  }
  else if (text.includes('ขอเปลี่ยนที่อยู่ร้าน')) {
    const storeName = cleanStoreName(userMessage.replace(/ขอเปลี่ยนที่อยู่ร้าน/g, '').trim());
    sessionStore.setPendingField(contextId, { storeName, field: 'address', label: 'ที่อยู่ร้าน', mode: 'replace' });
    return { text: `📍 กรุณาพิมพ์ที่อยู่ใหม่ของร้าน "${storeName}" ส่งมาได้เลยค่ะ:\n*(เช่น: 45/6 ถ.สุขุมวิท ชลบุรี)*`, flexMessage: null };
  }
  else if (text.includes('ขอใส่แผนที่ร้าน')) {
    const storeName = cleanStoreName(userMessage.replace(/ขอใส่แผนที่ร้าน/g, '').trim());
    sessionStore.setPendingField(contextId, { storeName, field: 'map_url', label: 'แผนที่ร้าน', mode: 'replace' });
    return { text: `🗺️ กรุณาส่งลิงก์ Google Maps หรือ พิกัดแผนที่ร้าน "${storeName}" มาได้เลยค่ะ:\n*(เช่น: https://maps.google.com/?q=13.81,100.56)*`, flexMessage: null };
  }
  else if (text.includes('ขอเปลี่ยนจัดส่งร้าน')) {
    const storeName = cleanStoreName(userMessage.replace(/ขอเปลี่ยนจัดส่งร้าน/g, '').trim());
    sessionStore.setPendingField(contextId, { storeName, field: 'delivery_by', label: 'จัดส่งโดย', mode: 'replace' });
    return { text: `🚚 กรุณาพิมพ์ช่องทาง/รอบจัดส่งใหม่ของร้าน "${storeName}" ส่งมาได้เลยค่ะ:\n*(เช่น: ขนส่ง Kerry Express / รถบริษัท)*`, flexMessage: null };
  }
  else if (text.includes('ขอเปลี่ยนเครดิตร้าน')) {
    const storeName = cleanStoreName(userMessage.replace(/ขอเปลี่ยนเครดิตร้าน/g, '').trim());
    sessionStore.setPendingField(contextId, { storeName, field: 'credit_days', label: 'เครดิตเทอม', mode: 'replace' });
    return { text: `💳 กรุณาพิมพ์จำนวนวันเครดิตเทอมใหม่ของร้าน "${storeName}" ส่งมาได้เลยค่ะ:\n*(เช่น: 60 วัน)*`, flexMessage: null };
  }
  else if (text.includes('ขอเพิ่มโน้ตร้าน')) {
    const storeName = cleanStoreName(userMessage.replace(/ขอเพิ่มโน้ตร้าน/g, '').trim());
    sessionStore.setPendingField(contextId, { storeName, field: 'notes', label: 'โน้ตเพิ่มเติม', mode: 'append' });
    return { text: `📌 กรุณาพิมพ์ข้อความโน้ตเพิ่มเติมของร้าน "${storeName}" ส่งมาได้เลยค่ะ:\n*(เช่น: ให้โทรแจ้งก่อนเข้าส่ง 1 ชั่วโมง)*`, flexMessage: null };
  }
  else if (text.includes('ขอเพิ่มไลน์ร้าน') || text.includes('ขอเปลี่ยนไลน์ร้าน') || text.includes('ขอใส่ไลน์ร้าน')) {
    const storeName = cleanStoreName(userMessage.replace(/ขอเพิ่มไลน์ร้าน|ขอเปลี่ยนไลน์ร้าน|ขอใส่ไลน์ร้าน/g, '').trim());
    sessionStore.setPendingField(contextId, { storeName, field: 'line_contact', label: 'ไลน์ผู้ติดต่อ', mode: 'replace' });
    return { text: `💬 กรุณาพิมพ์ LINE ID หรือ ลิ้งค์เพิ่มเพื่อน LINE ของร้าน "${storeName}" ส่งมาได้เลยค่ะ:\n*(เช่น: @store_owner / https://line.me/ti/p/XYZ123)*`, flexMessage: null };
  }

  // 🎯 2. คำสั่งกดปุ่ม 1-Tap หมวดข้อมูลการขาย (Sales Details)
  else if (text.includes('ขอเปลี่ยนประเภทชำระร้าน')) {
    const storeName = cleanStoreName(userMessage.replace(/ขอเปลี่ยนประเภทชำระร้าน/g, '').trim());
    sessionStore.setPendingField(contextId, { storeName, field: 'payment_type', label: 'ประเภทการชำระ', mode: 'replace' });
    return { text: `💳 กรุณาพิมพ์ประเภทการชำระเงินใหม่ของร้าน "${storeName}" ส่งมาได้เลยค่ะ:\n*(เช่น: โอนเงิน / เครดิต 30 วัน)*`, flexMessage: null };
  }
  else if (text.includes('ขอเปลี่ยนแบรนด์ร้าน')) {
    const storeName = cleanStoreName(userMessage.replace(/ขอเปลี่ยนแบรนด์ร้าน/g, '').trim());
    sessionStore.setPendingField(contextId, { storeName, field: 'brands_sold', label: 'แบรนด์ที่ขาย', mode: 'append' });
    return { text: `🏷️ กรุณาพิมพ์แบรนด์ที่ขายเพิ่มเติมของร้าน "${storeName}" ส่งมาได้เลยค่ะ:\n*(เช่น: Arrow, GQ)*`, flexMessage: null };
  }
  else if (text.includes('ขอเปลี่ยนวันสั่งล่าสุดร้าน')) {
    const storeName = cleanStoreName(userMessage.replace(/ขอเปลี่ยนวันสั่งล่าสุดร้าน/g, '').trim());
    sessionStore.setPendingField(contextId, { storeName, field: 'last_order_date', label: 'สั่งซื้อล่าสุด', mode: 'replace' });
    return { text: `📅 กรุณาพิมพ์วันที่สั่งซื้อล่าสุดใหม่ของร้าน "${storeName}" ส่งมาได้เลยค่ะ:\n*(เช่น: 10 สิงหาคม 2026)*`, flexMessage: null };
  }
  else if (text.includes('ขอเพิ่มยอดขายล่าสุดร้าน')) {
    const storeName = cleanStoreName(userMessage.replace(/ขอเพิ่มยอดขายล่าสุดร้าน/g, '').trim());
    sessionStore.setPendingField(contextId, { storeName, field: 'last_order_amount', label: 'ยอดขายล่าสุด', mode: 'append' });
    return { text: `💵 กรุณาพิมพ์ยอดขายล่าสุด (บาท) ของร้าน "${storeName}" ส่งมาได้เลยค่ะ:\n*(ระบบจะนำไปรวมสรุปยอดสะสมให้อัตโนมัติ)*`, flexMessage: null };
  }
  else if (text.includes('ขอเพิ่มสินค้าที่สั่งร้าน')) {
    const storeName = cleanStoreName(userMessage.replace(/ขอเพิ่มสินค้าที่สั่งร้าน/g, '').trim());
    sessionStore.setPendingField(contextId, { storeName, field: 'ordered_items', label: 'สินค้าที่สั่ง', mode: 'append' });
    return { text: `📦 กรุณาพิมพ์รายการสินค้าที่สั่งเพิ่มเติมของร้าน "${storeName}" ส่งมาได้เลยค่ะ:\n*(เช่น: เสื้อเชิ้ต 10 ตัว)*`, flexMessage: null };
  }
  else if (text.includes('ขอเพิ่มสินค้าขายดีร้าน')) {
    const storeName = cleanStoreName(userMessage.replace(/ขอเพิ่มสินค้าขายดีร้าน/g, '').trim());
    sessionStore.setPendingField(contextId, { storeName, field: 'top_selling_products', label: 'สินค้าขายดี', mode: 'append' });
    return { text: `⭐ กรุณาพิมพ์สินค้าขายดีประจำร้านเพิ่มเติมของร้าน "${storeName}" ส่งมาได้เลยค่ะ:\n*(เช่น: เสื้อเชิ้ตคอตตอน)*`, flexMessage: null };
  }

  // 🎯 3. คำสั่งกดปุ่ม 1-Tap หมวดโอกาสเสนอขาย (Sales Opportunities)
  else if (text.includes('ขอเปลี่ยนสถานะโอกาสร้าน')) {
    const storeName = cleanStoreName(userMessage.replace(/ขอเปลี่ยนสถานะโอกาสร้าน/g, '').trim());
    sessionStore.setPendingField(contextId, { storeName, field: 'opportunity_status', label: 'สถานะโอกาส', mode: 'replace' });
    return { text: `🎯 กรุณาพิมพ์สถานะโอกาสเสนอขายใหม่ของร้าน "${storeName}" ส่งมาได้เลยค่ะ:\n*(เช่น: 🔥 สูง / ⚡ ปานกลาง / 💤 ต่ำ)*`, flexMessage: null };
  }
  else if (text.includes('ขอเพิ่มสินค้าแนะนำร้าน')) {
    const storeName = cleanStoreName(userMessage.replace(/ขอเพิ่มสินค้าแนะนำร้าน/g, '').trim());
    sessionStore.setPendingField(contextId, { storeName, field: 'recommended_products', label: 'สินค้าแนะนำเสนอขาย', mode: 'append' });
    return { text: `🛍️ กรุณาพิมพ์สินค้าแนะนำเสนอขายเพิ่มเติมของร้าน "${storeName}" ส่งมาได้เลยค่ะ:\n*(เช่น: กระเป๋าเป้สะพายหลัง)*`, flexMessage: null };
  }
  else if (text.includes('ขอเลือกลบสินค้าแนะนำร้าน')) {
    const storeName = cleanStoreName(userMessage.replace(/ขอเลือกลบสินค้าแนะนำร้าน/g, '').trim());
    const store = db.findStoreByName(storeName, contextId);
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
    const updatedStore = db.removeRecommendedProduct(storeName, 'ALL', contextId);
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
      const updatedStore = db.removeRecommendedProduct(storeName, item, contextId);
      return {
        text: `✅ ลบสินค้าแนะนำ "${item}" ของร้าน "${storeName}" เรียบร้อยแล้วค่ะ!`,
        flexMessage: buildStoreSalesOpportunitiesFlex(updatedStore)
      };
    }
  }
  else if (text.includes('ขอเพิ่มเหตุผลโอกาสทองร้าน') || text.includes('ขอเพิ่มเหตุผลร้าน') || text.includes('ขอเปลี่ยนเหตุผลร้าน')) {
    const storeName = cleanStoreName(userMessage.replace(/ขอเพิ่มเหตุผลโอกาสทองร้าน|ขอเพิ่มเหตุผลร้าน|ขอเปลี่ยนเหตุผลร้าน/g, '').trim());
    sessionStore.setPendingField(contextId, { storeName, field: 'reason', label: 'เหตุผล / โอกาสทอง', mode: 'replace' });
    return { text: `💡 กรุณาพิมพ์เหตุผลหรือโอกาสทองใหม่ของร้าน "${storeName}" ส่งมาได้เลยค่ะ:\n*(เช่น: ร้านเปิดโซนใหม่ / กำลังจัดโปรโมชั่นประจำปี)*`, flexMessage: null };
  }
  else if (text.includes('ขอเปลี่ยนแผนงานวันเข้าเสนอขายร้าน')) {
    const storeName = cleanStoreName(userMessage.replace(/ขอเปลี่ยนแผนงานวันเข้าเสนอขายร้าน/g, '').trim());
    sessionStore.setPendingField(contextId, { storeName, field: 'target_pitch_date', label: 'แผนงานวันเข้าเสนอขาย', mode: 'replace' });
    return { text: `🗓️ กรุณาพิมพ์แผนงานวันเข้าเสนอขายใหม่ของร้าน "${storeName}" ส่งมาได้เลยค่ะ:\n*(เช่น: 15 กันยายน 2026 / สัปดาห์หน้า)*`, flexMessage: null };
  }

  // D0. คำสั่งสรุปผลรวมและภาพรวมระบบทั้งหมด (Master System Overview Dashboard)
  if (text.includes('ผลรวมทั้งระบบ') || text.includes('ขอดูผลรวมทั้งระบบ') || text.includes('ผลรวมระบบ') || text.includes('สรุปผลรวม') || text.includes('สรุปภาพรวมทั้งระบบ') || text.includes('ภาพรวมทั้งระบบ') || text.includes('สรุปภาพรวมระบบ')) {
    const isPrivateChat = String(contextId || '').trim().toLowerCase() === String(userId || '').trim().toLowerCase();
    const isMasterGlobalView = isPrivateChat && db.isMasterAdmin(userId, contextId);
    
    const targetCtx = (isMasterGlobalView || db.isMasterAdmin(userId, contextId)) ? 'all' : contextId;
    const stores = db.getStores(targetCtx);

    const masterNotice = isMasterGlobalView ? '👑 [มุมมองผู้ดูแลหลัก - ผลรวมทั้งระบบ]: ' : '';

    return {
      text: `${masterNotice}📊 สรุปรายงานผลรวมและภาพรวมระบบทั้งหมด (${stores.length} ร้านค้า) เรียบร้อยแล้วค่ะ!`,
      flexMessage: buildMasterSystemOverviewFlex(stores)
    };
  }

  // C0. คำสั่งแสดงรายชื่อและที่อยู่ของร้านค้า ( Master Admin รวมข้อมูลทุกกลุ่มแชตเฉพาะในแชตส่วนตัว 1-on-1 เท่านั้น )
  if (text.includes('แสดงรายชื่อ') || text.includes('ขอรายชื่อ') || text.includes('รายชื่อร้าน') || text.includes('รายชื่อร้านค้า') || text.includes('ร้านค้าทั้งหมด')) {
    const isPrivateChat = String(contextId || '').trim().toLowerCase() === String(userId || '').trim().toLowerCase();
    const isMasterGlobalView = isPrivateChat && db.isMasterAdmin(userId, contextId);
    const isSimulatorOrDefault = !contextId || contextId === 'default' || contextId === 'simulator';
    const targetCtx = (isMasterGlobalView || isSimulatorOrDefault || text.includes('ทั้งหมด')) ? 'all' : contextId;
    const stores = db.getStores(targetCtx);

    const masterNotice = isMasterGlobalView ? '👑 [มุมมองผู้ดูแลหลัก - รายชื่อรวมทุกกลุ่มแชต]: ' : '';

    // C0.1 หากสั่งดูทั้งหมดในระบบ
    if (text.includes('แสดงรายชื่อทั้งหมด') && !text.includes('จ.') && !text.includes('จังหวัด')) {
      return {
        text: `${masterNotice}🏪 รายชื่อและที่อยู่ของร้านค้าทั้งหมด (${stores.length} ร้าน) ค่ะ:`,
        flexMessage: buildFilteredStoresListFlex(`ทั้งหมดในระบบ (${stores.length} ร้าน)`, stores)
      };
    }

    // C0.2 หากสั่งดูทั้งหมดในจังหวัดเฉพาะ (เช่น "แสดงรายชื่อทั้งหมด จ.นนทบุรี")
    if (text.includes('ทั้งหมด จ.') || text.includes('ทั้งหมดจังหวัด') || text.includes('ทั้งหมดใน จ.')) {
      const provName = text.replace(/.*(?:ทั้งหมด จ\.|ทั้งหมดจังหวัด|ทั้งหมดใน จ\.)\s*/, '').trim();
      const filtered = stores.filter(s => {
        const addr = (s.general_info && s.general_info.address) || s.address || '';
        const loc = parseAddressLocation(addr);
        return loc.province.includes(provName) || provName.includes(loc.province);
      });
      return {
        text: `${masterNotice}🏬 รายชื่อและที่อยู่ของร้านค้าทั้งหมดใน จ.${provName} (${filtered.length} ร้าน) ค่ะ:`,
        flexMessage: buildFilteredStoresListFlex(`จ.${provName}`, filtered)
      };
    }

    // C0.3 หากระบุทั้ง อำเภอ และ จังหวัด (เช่น "แสดงรายชื่อ อ.ไทรน้อย จ.นนทบุรี")
    if ((text.includes('อ.') || text.includes('อำเภอ') || text.includes('เขต')) && (text.includes('จ.') || text.includes('จังหวัด'))) {
      const distMatch = text.match(/(?:อ\.|อำเภอ|เขต)\s*([^\s]+)/);
      const provMatch = text.match(/(?:จ\.|จังหวัด)\s*([^\s]+)/);
      const distName = distMatch ? distMatch[1].trim() : '';
      const provName = provMatch ? provMatch[1].trim() : '';

      const filtered = stores.filter(s => {
        const addr = (s.general_info && s.general_info.address) || s.address || '';
        const loc = parseAddressLocation(addr);
        const matchProv = !provName || loc.province.includes(provName) || provName.includes(loc.province);
        const matchDist = !distName || loc.district.includes(distName) || distName.includes(loc.district);
        return matchProv && matchDist;
      });

      return {
        text: `${masterNotice}🏘️ รายชื่อและที่อยู่ของร้านค้าใน ${distName} จ.${provName} (${filtered.length} ร้าน) ค่ะ:`,
        flexMessage: buildFilteredStoresListFlex(`${distName} จ.${provName}`, filtered)
      };
    }

    // C0.4 หากระบุเฉพาะ จังหวัด (เช่น "แสดงรายชื่อ จ.นนทบุรี") -> แสดงกรุ๊ปย่อยตามอำเภอ/เขต
    if (text.includes('จ.') || text.includes('จังหวัด')) {
      const provMatch = text.match(/(?:จ\.|จังหวัด)\s*([^\s]+)/);
      const provName = provMatch ? provMatch[1].trim() : text.replace(/.*(?:จ\.|จังหวัด)\s*/, '').trim();

      const filtered = stores.filter(s => {
        const addr = (s.general_info && s.general_info.address) || s.address || '';
        const loc = parseAddressLocation(addr);
        return loc.province.includes(provName) || provName.includes(loc.province);
      });

      return {
        text: `${masterNotice}📍 พบทั้งหมด ${filtered.length} ร้านค้าใน จ.${provName} ค่ะ กรุณาเลือกกลุ่มย่อยตามอำเภอ/เขต หรือเลือกดูร้านทั้งหมดได้เลยค่ะ:`,
        flexMessage: buildDistrictGroupFlex(provName, filtered)
      };
    }

    // C0.5 คำสั่งเริ่มต้น "แสดงรายชื่อ" -> แสดงกรุ๊ปตามจังหวัด
    return {
      text: `${masterNotice}📍 กรุณาเลือกจังหวัดที่ต้องการดูรายชื่อร้านค้า หรือเลือกดูร้านค้าทั้งหมดได้เลยค่ะ:`,
      flexMessage: buildProvinceGroupFlex(stores)
    };
  }

  // C. คำสั่งดึงข้อมูลสรุปตามหมวดหมู่ (Retrieval Commands)
  if (text.includes('ดูสินค้าสั่งซื้อ') || text.includes('ขอซูมสินค้า') || text.includes('ดูสินค้าแบรนด์')) {
    const match = text.match(/(?:ดูสินค้าสั่งซื้อ|ขอซูมสินค้า|ดูสินค้าแบรนด์)\s+([^\s]+)\s*(?:ร้าน)?\s*(.*)/i);
    let targetBrand = match ? match[1].trim() : null;
    let rawStoreName = match ? match[2].trim() : null;
    
    if (!rawStoreName) rawStoreName = sessionStore.getLastStore(contextId);
    const store = db.findStoreByName(rawStoreName, contextId);

    if (store && targetBrand) {
      const details = store.sales_details || {};
      const brandsArr = Array.isArray(details.brands_sold) ? details.brands_sold : [];
      const orderedItemsArr = Array.isArray(details.ordered_items) ? details.ordered_items : [];
      
      const matchedItems = orderedItemsArr.filter(item => getMatchingBrand(item, [targetBrand, ...brandsArr]) === targetBrand || String(item).toLowerCase().includes(targetBrand.toLowerCase()));
      
      return {
        text: `📦 รายชื่อสินค้าที่สั่งซื้อแบรนด์ "${targetBrand}" ของร้าน "${store.store_name}" ค่ะ (${matchedItems.length > 0 ? matchedItems.length : orderedItemsArr.length} รายการ)`,
        flexMessage: buildBrandOrderedItemsFlex(store, targetBrand, matchedItems.length > 0 ? matchedItems : orderedItemsArr)
      };
    }
  }
  else if (text.includes('ขอข้อมูลการขาย') || text.includes('ขอรายละเอียดการขาย') || text.includes('ขอยอดขาย') || text.includes('ขอประวัติการสั่ง')) {
    const storeName = cleanStoreName(text) || sessionStore.getLastStore(contextId);
    const store = db.findStoreByName(storeName, contextId);
    if (store) {
      sessionStore.setLastStore(contextId, store.store_name);
      return { text: `📊 ข้อมูลการขาย 7 หัวข้อหลักของร้าน "${store.store_name}" ค่ะ`, flexMessage: buildStoreSalesDetailsFlex(store) };
    } else { return { text: `ไม่พบข้อมูลการขายของร้าน "${storeName}" ในระบบค่ะ`, flexMessage: null }; }
  }
  else if (text.includes('ขอโอกาสเสนอขาย') || text.includes('ขอข้อมูลโอกาสเสนอขาย') || text.includes('ขอข้อมูลโอกาส') || text.includes('ขอโอกาสขาย') || text.includes('ขอโอกาส')) {
    const storeName = cleanStoreName(text) || sessionStore.getLastStore(contextId);
    const store = db.findStoreByName(storeName, contextId);
    if (store) {
      sessionStore.setLastStore(contextId, store.store_name);
      return { text: `🎯 สรุปโอกาสเสนอขายและสินค้าแนะนำ (Upsell/Cross-sell) ของร้าน "${store.store_name}" ค่ะ`, flexMessage: buildStoreSalesOpportunitiesFlex(store) };
    } else { return { text: `ไม่พบข้อมูลโอกาสเสนอขายของร้าน "${storeName}" ในระบบค่ะ`, flexMessage: null }; }
  }
  else if (text.includes('ขอข้อมูลร้าน') || text.includes('ขอข้อมูลพื้นฐาน') || text.includes('ขอข้อมูล') || text.includes('ดึงข้อมูลร้าน')) {
    const targetStoreName = cleanStoreName(text) || sessionStore.getLastStore(contextId);
    const isPrivateChat = String(contextId || '').trim().toLowerCase() === String(userId || '').trim().toLowerCase();
    const isMasterGlobalView = isPrivateChat && db.isMasterAdmin(userId, contextId);
    const store = db.findStoreByName(targetStoreName, isMasterGlobalView ? 'all' : contextId);
    if (store) {
      sessionStore.setLastStore(contextId, store.store_name);
      return {
        text: `🏬 สรุปข้อมูลครบทั้ง 3 หมวดหมู่หลักของร้าน "${store.store_name}" ค่ะ\n(1. ข้อมูลพื้นฐานร้านค้า | 2. ข้อมูลการขาย | 3. โอกาสเสนอขาย)`,
        flexMessage: buildAll3CategoryFlexCards(store)
      };
    } else {
      return { text: targetStoreName ? `ไม่พบข้อมูลร้าน "${targetStoreName}" ในระบบค่ะ` : `กรุณาระบุชื่อร้านค้าที่ต้องการขอข้อมูลค่ะ\n*(เช่น: ขอข้อมูลร้าน เชียงใหม่ซุปเปอร์ถูก)*`, flexMessage: null };
    }
  }

  // A. บันทึกและสกัดข้อมูลอัตโนมัติตามหัวข้อที่ตรงกัน (Auto-Classify & Save All Matching Topics - Single & Multiline)
  if (text.includes('ผู้ติดต่อ') || text.includes('เบอร์') || text.includes('โทร') || text.includes('ที่อยู่') || text.includes('แผนที่') || text.includes('จัดส่ง') || text.includes('เครดิต') || text.includes('โน้ต') || text.includes('ไลน์') || text.includes('line') || text.includes('ชำระ') || text.includes('แบรนด์') || text.includes('สั่งซื้อ') || text.includes('ยอดขาย') || text.includes('ขายดี') || text.includes('สถานะ') || text.includes('แนะนำ') || text.includes('เหตุผล') || text.includes('โอกาสทอง') || text.includes('แผนงาน') || text.includes('เสนอขาย')) {
    const allParsed = parseAllStoreCategories(userMessage);

    let storeName = allParsed.store_name;
    if (!storeName) {
      if (userMessage.includes(':')) {
        storeName = userMessage.split(':')[0].replace(/บันทึกข้อมูลร้าน|บันทึกข้อมูล|บันทึกร้าน|อัปเดตข้อมูลร้าน|ร้านค้า|ร้าน/g, '').trim();
      } else {
        const activeSession = sessionStore.getActiveStoreSession(contextId);
        storeName = activeSession ? activeSession.storeName : (sessionStore.getLastStore(contextId) || null);
      }
    }
    storeName = cleanStoreName(storeName);

    if (storeName) {
      let savedStore = db.findStoreByName(storeName, contextId);
      let updatedCount = 0;

      // บันทึกหมวด 1: ข้อมูลพื้นฐานร้านค้า
      if (allParsed.general_info && Object.values(allParsed.general_info).some(v => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0))) {
        savedStore = db.saveGeneralInfo(storeName, allParsed.general_info, 'append', contextId);
        updatedCount++;
      }

      // บันทึกหมวด 2: ข้อมูลการขาย
      if (allParsed.sales_details && Object.values(allParsed.sales_details).some(v => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0))) {
        savedStore = db.saveSalesDetails(storeName, allParsed.sales_details, 'append', contextId);
        updatedCount++;
      }

      // บันทึกหมวด 3: โอกาสเสนอขาย
      if (allParsed.sales_opportunities && Object.values(allParsed.sales_opportunities).some(v => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0))) {
        savedStore = db.saveSalesOpportunities(storeName, allParsed.sales_opportunities, 'append', contextId);
        updatedCount++;
      }

      if (savedStore && updatedCount > 0) {
        sessionStore.setLastStore(contextId, savedStore.store_name);
        const activeSession = sessionStore.getActiveStoreSession(contextId);
        const isRecordingSession = activeSession && activeSession.isRecording;

        return {
          text: `✅ สกัดและแยกแยะบันทึกข้อมูลจัดเข้าตามหัวข้อของร้าน "${savedStore.store_name}" เรียบร้อยแล้วค่ะ!`,
          flexMessage: buildAll3CategoryFlexCards(savedStore, isRecordingSession)
        };
      }
    }
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

  // C. หากเป็นแชตกลุ่มไลน์ (Group Chat) และข้อความไม่ใช่คำสั่งเรียกบอท ให้เงียบไม่ตอบแทรก (Silent Fallback V1.1)
  const isGroupChat = contextId.startsWith('C') || contextId.startsWith('R');
  if (isGroupChat) {
    if (text.includes('สวัสดี') || text.includes('บอท') || text.includes('ช่วยด้วย') || text.includes('เมนู') || text.includes('คำสั่ง')) {
      return {
        text: `สวัสดีค่ะ! SalesAI Assistant พร้อมดูแลและสรุปข้อมูล 3 หมวดหลักดังนี้ค่ะ:\n1. 🏬 **ข้อมูลพื้นฐานร้านค้า:** "ขอข้อมูลร้านสมศักดิ์"\n2. 📊 **ข้อมูลการขาย:** "ขอข้อมูลการขายร้านสมศักดิ์"\n3. 🎯 **โอกาสเสนอขาย:** "ขอข้อมูลโอกาสเสนอขายร้านสมศักดิ์"\n\n💡 หากต้องการขอตัวอย่างฟอร์มป้อนข้อมูล พิมพ์ **"แบบฟอร์ม"** ได้ตลอดเวลาค่ะ`,
        flexMessage: null
      };
    }
    // หากสมาชิกกลุ่มคุยกันเรื่องทั่วไปที่ไม่ใช่คำสั่งบอท -> เงียบไม่ตอบกลับ (Silent Ignore 100%)
    return null;
  }

  return {
    text: `สวัสดีค่ะ! SalesAI Assistant พร้อมดูแลและสรุปข้อมูล 3 หมวดหลักดังนี้ค่ะ:\n1. 🏬 **ข้อมูลพื้นฐานร้านค้า:** "ขอข้อมูลร้านสมศักดิ์"\n2. 📊 **ข้อมูลการขาย:** "ขอข้อมูลการขายร้านสมศักดิ์"\n3. 🎯 **โอกาสเสนอขาย:** "ขอข้อมูลโอกาสเสนอขายร้านสมศักดิ์"\n\n💡 หากต้องการขอตัวอย่างฟอร์มป้อนข้อมูล พิมพ์ **"แบบฟอร์ม"** ได้ตลอดเวลาค่ะ`,
    flexMessage: null
  };
}

/**
 * ประมวลผลเมื่อพนักงานขายส่ง/แชร์การ์ดเพื่อนในไลน์ (LINE Contact Sharing Message Event)
 */
export async function processContactMessage(contactName, contactUserId, lineUrl, contextId = 'default', userId = 'default') {
  if (!db.isContextAllowed(contextId, userId)) return null;

  const activeSession = sessionStore.getActiveStoreSession(contextId);
  const pendingField = sessionStore.getPendingField(contextId);
  let targetStoreName = (pendingField ? pendingField.storeName : null) || 
                        (activeSession ? activeSession.storeName : null) || 
                        sessionStore.getLastStore(contextId);

  if (targetStoreName) {
    const updatedStore = db.saveGeneralInfo(targetStoreName, {
      line_contact: lineUrl,
      line_contacts: [lineUrl],
      contact_persons: [contactName]
    }, 'append', contextId);

    sessionStore.clearPendingField(contextId);

    const flexCard = buildStoreGeneralInfoFlex(updatedStore, false, contextId);

    return {
      text: `✅ ได้รับการแชร์เพื่อนในไลน์ "${contactName}" และบันทึกเข้าเป็นไลน์ผู้ติดต่อของร้าน "${updatedStore.store_name}" เรียบร้อยแล้วค่ะ!\n*(ผู้ดูแลระบบสามารถกดปุ่ม [🟢 ➕ กดแอดไลน์] บนการ์ดเพื่อกดแอดเพื่อนได้ทันที)*`,
      flexMessage: flexCard
    };
  } else {
    sessionStore.setPendingField(contextId, {
      field: 'line_contact',
      lineUrl: lineUrl,
      contactName: contactName,
      label: 'ไลน์ผู้ติดต่อจากการแชร์เพื่อน'
    });

    return {
      text: `🟢 ได้รับข้อมูลแชร์เพื่อนในไลน์ "${contactName}" เรียบร้อยแล้วค่ะ!\n\n📌 กรุณาพิมพ์บอกชื่อร้านค้าที่ต้องการบันทึกไลน์ผู้ติดต่อนี้ลงไปได้เลยค่ะ:\n*(เช่น: บันทึกร้านสมศักดิ์การค้า)*`,
      flexMessage: null
    };
  }
}
