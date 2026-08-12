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

  findActivePending() {
    if (pendingConfirmations.size === 0) return null;
    const entries = Array.from(pendingConfirmations.entries());
    const [key, val] = entries[entries.length - 1];
    return { key, ...val };
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

  findActivePendingField() {
    if (pendingFieldUpdates.size === 0) return null;
    const entries = Array.from(pendingFieldUpdates.entries());
    const [key, val] = entries[entries.length - 1];
    return { key, ...val };
  }
};
