import { config } from '../config.js';
import { db } from '../database/db.js';

const profileCache = new Map();

/**
 * ดึงชื่อโปรไฟล์ LINE ของผู้ใช้จาก LINE Messaging API
 */
export async function getLineUserProfile(userId, groupId = null) {
  if (!userId || userId === 'default') return null;
  if (profileCache.has(userId)) return profileCache.get(userId);

  const token = config.line.channelAccessToken;
  if (!token || token === 'your_line_channel_access_token_here') return null;

  try {
    let url = `https://api.line.me/v2/bot/profile/${userId}`;
    if (groupId && (groupId.startsWith('C') || groupId.startsWith('R'))) {
      url = `https://api.line.me/v2/bot/group/${groupId}/member/${userId}`;
    }

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.displayName) {
        profileCache.set(userId, data.displayName);
        db.saveProfileName(userId, 'user', data.displayName);
        return data.displayName;
      }
    }
  } catch (err) {
    console.error(`[LINE Profile Fetch Error (${userId})]:`, err.message);
  }

  return null;
}

/**
 * ดึงชื่อกลุ่มไลน์จาก LINE Messaging API
 */
export async function getLineGroupSummary(groupId) {
  if (!groupId || !groupId.startsWith('C')) return null;
  if (profileCache.has(groupId)) return profileCache.get(groupId);

  const token = config.line.channelAccessToken;
  if (!token || token === 'your_line_channel_access_token_here') return null;

  try {
    const res = await fetch(`https://api.line.me/v2/bot/group/${groupId}/summary`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.groupName) {
        profileCache.set(groupId, data.groupName);
        db.saveProfileName(groupId, 'group', data.groupName);
        return data.groupName;
      }
    }
  } catch (err) {
    console.error(`[LINE Group Fetch Error (${groupId})]:`, err.message);
  }

  return null;
}
