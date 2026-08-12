/**
 * Session manager for handling interactive pending confirmations, 1-field updates, and last store context.
 */
const pendingConfirmations = new Map();
const pendingFieldUpdates = new Map();
const lastViewedStores = new Map();

export const sessionStore = {
  // 1. จัดการการบันทึกร้านที่เรียกดูล่าสุด (Last Viewed Store Context)
  setLastStore(userId, storeName) {
    const key = String(userId || 'default').toLowerCase().trim();
    lastViewedStores.set(key, storeName);
  },

  getLastStore(userId) {
    const key = String(userId || 'default').toLowerCase().trim();
    return lastViewedStores.get(key) || null;
  },

  // 2. จัดการการรอยืนยันการทับ/ต่อท้ายข้อมูล (Confirmation State)
  setPending(userIdOrStore, pendingData) {
    const key = String(userIdOrStore).toLowerCase().trim();
    pendingConfirmations.set(key, {
      ...pendingData,
      created_at: Date.now()
    });
  },

  getPending(userIdOrStore) {
    const key = String(userIdOrStore).toLowerCase().trim();
    return pendingConfirmations.get(key) || null;
  },

  clearPending(userIdOrStore) {
    const key = String(userIdOrStore).toLowerCase().trim();
    pendingConfirmations.delete(key);
  },

  findActivePending(userId = 'default') {
    const key = String(userId || 'default').toLowerCase().trim();
    const val = pendingConfirmations.get(key);
    if (val) return { key, ...val };
    return null;
  },

  // 3. จัดการสถานะรอเติมข้อมูลหัวข้อเดียว (1-Field Prompt State)
  setPendingField(userId, fieldData) {
    const key = String(userId || 'default').toLowerCase().trim();
    pendingFieldUpdates.set(key, {
      ...fieldData,
      created_at: Date.now()
    });
  },

  getPendingField(userId) {
    const key = String(userId || 'default').toLowerCase().trim();
    return pendingFieldUpdates.get(key) || null;
  },

  clearPendingField(userId) {
    const key = String(userId || 'default').toLowerCase().trim();
    pendingFieldUpdates.delete(key);
  },

  findActivePendingField(userId = 'default') {
    const key = String(userId || 'default').toLowerCase().trim();
    const val = pendingFieldUpdates.get(key);
    if (val) return { key, ...val };
    return null;
  },

  // 4. จัดการสถานะกำลังบันทึกข้อมูลพื้นฐานร้านค้าค้างอยู่ (Active Store Recording Session)
  setActiveStoreSession(userId, storeName) {
    const key = String(userId || 'default').toLowerCase().trim();
    activeStoreSessions.set(key, {
      storeName,
      isRecording: true,
      created_at: Date.now()
    });
  },

  getActiveStoreSession(userId) {
    const key = String(userId || 'default').toLowerCase().trim();
    return activeStoreSessions.get(key) || null;
  },

  clearActiveStoreSession(userId) {
    const key = String(userId || 'default').toLowerCase().trim();
    activeStoreSessions.delete(key);
  }
};

const activeStoreSessions = new Map();
