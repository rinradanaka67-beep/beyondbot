'use strict';
/**
 * HSHO DISCORD VERIFY BOT BY NONGCHE
 * ระบบรออนุมัติ: สมาชิกกรอก -> แอดมินกด อนุมัติ/ปฏิเสธ -> เขียนไฟล์เฉพาะที่อนุมัติ
 */
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { config } = require('../config');
const verification = require('./verification.service');
const googleSheets = require('./google-sheets.service');

const FILE = path.join(config.dataDir, 'pending.json');

let queue = Promise.resolve();
const withLock = (task) => {
  const run = queue.then(task, task);
  queue = run.catch(() => {});
  return run;
};

const readAll = async () => {
  try {
    const raw = await fs.readFile(FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    return [];
  }
};

const writeAll = async (items) => {
  await fs.mkdir(config.dataDir, { recursive: true });
  await fs.writeFile(FILE, `${JSON.stringify(items, null, 2)}\n`, 'utf8');
};

async function createPending({
  name, discordId, steamId, userId, username, guildId,
}) {
  return withLock(async () => {
    const all = await readAll();
    const request = {
      id: crypto.randomBytes(4).toString('hex'),
      at: new Date().toISOString(),
      name,
      discordId,
      steamId,
      userId,
      username,
      guildId: guildId || null,
      status: 'pending',
      decidedAt: null,
      decidedBy: null,
      reason: null,
    };
    all.push(request);
    await writeAll(all);
    await googleSheets.upsert(request); // ไม่ให้ Sheets พังแล้วบล็อกการอนุมัติ
    return request;
  });
}

async function listPending() {
  return (await readAll()).filter((item) => item.status === 'pending');
}

async function getRequest(id) {
  return (await readAll()).find((item) => item.id === String(id)) || null;
}

async function decide(id, { approved, adminId, reason = '' } = {}) {
  return withLock(async () => {
    const all = await readAll();
    const request = all.find((item) => item.id === String(id));
    if (!request) throw new Error('REQUEST_NOT_FOUND');
    if (request.status !== 'pending') throw new Error('ALREADY_DECIDED');

    request.status = approved ? 'approved' : 'rejected';
    request.decidedAt = new Date().toISOString();
    request.decidedBy = adminId || null;
    request.reason = reason || null;
    await writeAll(all);
    await googleSheets.upsert(request); // อัปเดตแถวเดิมเป็น approved/rejected

    let record = null;
    if (approved) {
      record = await verification.record({
        name: request.name,
        discordId: request.discordId,
        steamId: request.steamId,
        userId: request.userId,
        username: request.username,
        guildId: request.guildId,
      });
    }
    return { request, record };
  });
}

async function pendingCount() {
  return (await listPending()).length;
}

module.exports = { FILE, createPending, listPending, getRequest, decide, pendingCount };
