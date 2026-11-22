'use strict';
/**
 * HSHO DISCORD VERIFY BOT BY NONGCHE
 * ส่งข้อมูล Verify ไป Google Sheets ผ่าน Apps Script Web App
 *
 * - ถ้าไม่ได้ใส่ GOOGLE_SHEETS_URL ใน .env -> ข้ามเลย (ใช้เฉพาะไฟล์ในเครื่อง)
 * - ถ้า Sheets พัง/ช้า -> ไม่ทำให้บอทหรือการอนุมัติพัง (ไฟล์ในเครื่องยังเซฟอยู่เสมอ)
 * - ทุกคำขอจะถูก upsert ด้วย id -> กดอนุมัติจะไปอัปเดตแถวเดิม ไม่ใช่เพิ่มแถวซ้ำ
 */
const { config } = require('../config');

const HEADERS = [
  'id', 'at', 'status', 'name', 'discord_id', 'steam_id',
  'discord_user_id', 'username', 'guild_id', 'decided_at', 'decided_by', 'reason',
];

let queue = Promise.resolve();
const withLock = (task) => {
  const run = queue.then(task, task);
  queue = run.catch(() => {});
  return run;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const toRow = (request) => ({
  id: request.id,
  at: request.at,
  status: request.status,
  name: request.name,
  discord_id: request.discordId,
  steam_id: request.steamId,
  discord_user_id: request.userId,
  username: request.username,
  guild_id: request.guildId,
  decided_at: request.decidedAt,
  decided_by: request.decidedBy,
  reason: request.reason,
});

async function post(row) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (config.googleSheetsSecret) headers['X-Nongche-Secret'] = config.googleSheetsSecret;
    const response = await fetch(config.googleSheetsUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(row),
      signal: controller.signal,
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`);
    try { return JSON.parse(text); } catch { return { ok: true }; }
  } finally {
    clearTimeout(timer);
  }
}

async function upsert(request) {
  if (!config.googleSheetsUrl) return { skipped: true };
  return withLock(async () => {
    const row = toRow(request);
    let lastError;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const result = await post(row);
        if (result && result.ok === false) throw new Error(result.error || 'Sheets ปฏิเสธข้อมูล');
        console.log(`[SHEETS] ${request.status} ${request.id} -> ${result.updated ? 'update' : 'append'}`);
        return result;
      } catch (error) {
        lastError = error;
        if (attempt < 2) await sleep(500 * (attempt + 1));
      }
    }
    console.warn(`[WARN] ส่ง Google Sheets ไม่สำเร็จ (${request.id}): ${lastError?.message}`);
    return { ok: false, error: lastError?.message };
  });
}

async function testConnection() {
  if (!config.googleSheetsUrl) return { skipped: true };
  return upsert({
    id: `test-${Date.now()}`,
    at: new Date().toISOString(),
    status: 'connected',
    name: 'BY NONGCHE',
    discordId: '',
    steamId: '',
    userId: '',
    username: 'connection-test',
    guildId: config.guildId,
    decidedAt: null,
    decidedBy: null,
    reason: 'ทดสอบการเชื่อมต่อ',
  });
}

module.exports = { HEADERS, toRow, upsert, testConnection };
