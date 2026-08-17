import { config } from '../config.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const whitelistPath = path.join(__dirname, '../database/whitelist.json');
const storesPath = path.join(__dirname, '../database/stores.json');

const REPO_OWNER = 'SPS-54';
const REPO_NAME = 'line-sales-ai-agent';
const WHITELIST_FILE_PATH_IN_REPO = 'line-sales-ai-agent/src/database/whitelist.json';
const STORES_FILE_PATH_IN_REPO = 'line-sales-ai-agent/src/database/stores.json';

/**
 * ซิงค์ไฟล์ whitelist.json ขึ้น GitHub อัตโนมัติทันทีที่ Master Admin กดลงทะเบียนสิทธิ์
 */
export async function syncWhitelistToGitHub() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    console.log('[GitHub Auto-Sync Whitelist]: No GITHUB_TOKEN set. Skipping auto-commit to GitHub.');
    return false;
  }

  try {
    const fileData = fs.readFileSync(whitelistPath, 'utf-8');
    const contentBase64 = Buffer.from(fileData).toString('base64');

    const getUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${WHITELIST_FILE_PATH_IN_REPO}`;
    const getRes = await fetch(getUrl, {
      headers: {
        'Authorization': `token ${token}`,
        'User-Agent': 'LineSalesAIAgent',
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    let sha = null;
    if (getRes.ok) {
      const json = await getRes.json();
      sha = json.sha;
    }

    const putRes = await fetch(getUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'User-Agent': 'LineSalesAIAgent',
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        message: '🤖 Auto-sync whitelist.json via Master Admin approval',
        content: contentBase64,
        sha: sha || undefined
      })
    });

    if (putRes.ok) {
      console.log('[GitHub Auto-Sync Whitelist OK]: whitelist.json synced to GitHub successfully!');
      return true;
    } else {
      const errText = await putRes.text();
      console.error('[GitHub Auto-Sync Whitelist Error]:', errText);
      return false;
    }
  } catch (err) {
    console.error('[GitHub Auto-Sync Whitelist Exception]:', err.message);
    return false;
  }
}

/**
 * ซิงค์ไฟล์ stores.json ขึ้น GitHub อัตโนมัติทันทีที่มีการบันทึกหรือแก้ไขข้อมูลร้านค้าในไลน์
 */
export async function syncStoresToGitHub() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    console.log('[GitHub Auto-Sync Stores]: No GITHUB_TOKEN set. Skipping auto-commit to GitHub.');
    return false;
  }

  try {
    const fileData = fs.readFileSync(storesPath, 'utf-8');
    const contentBase64 = Buffer.from(fileData).toString('base64');

    const getUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${STORES_FILE_PATH_IN_REPO}`;
    const getRes = await fetch(getUrl, {
      headers: {
        'Authorization': `token ${token}`,
        'User-Agent': 'LineSalesAIAgent',
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    let sha = null;
    if (getRes.ok) {
      const json = await getRes.json();
      sha = json.sha;
    }

    const putRes = await fetch(getUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'User-Agent': 'LineSalesAIAgent',
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        message: '🤖 Auto-sync stores.json via LINE store save/update',
        content: contentBase64,
        sha: sha || undefined
      })
    });

    if (putRes.ok) {
      console.log('[GitHub Auto-Sync Stores OK]: stores.json synced to GitHub successfully!');
      return true;
    } else {
      const errText = await putRes.text();
      console.error('[GitHub Auto-Sync Stores Error]:', errText);
      return false;
    }
  } catch (err) {
    console.error('[GitHub Auto-Sync Stores Exception]:', err.message);
    return false;
  }
}
