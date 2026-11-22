'use strict';
/**
 * HSHO DISCORD VERIFY BOT BY NONGCHE
 * เก็บข้อมูลที่ผู้เล่นกรอกทั้ง 3 ช่อง (Name / DiscordID / SteamID) ลงไฟล์
 *
 *  data/steamids.txt       -> SteamID ทั้งหมด คั่นด้วย "," (ตามตัวอย่างที่ต้องการ)
 *  data/verifications.csv  -> ประวัติ Name / DiscordID / SteamID
 *  data/verifications.json -> ข้อมูลเดียวกันในรูปแบบ JSON
 */
const fs = require('node:fs/promises');
const path = require('node:path');
const { config } = require('../config');

const FILES = Object.freeze({
  steam: path.join(config.dataDir, 'steamids.txt'),
  csv: path.join(config.dataDir, 'verifications.csv'),
  json: path.join(config.dataDir, 'verifications.json'),
});

// ป้องกันเขียนไฟล์พร้อมกันหลาย interaction
let queue = Promise.resolve();
const withLock = (task) => {
  const run = queue.then(task, task);
  queue = run.catch(() => {});
  return run;
};

const isValidSteamId = (value) => /^\d{15,20}$/.test(String(value || '').trim());
const isValidDiscordId = (value) => /^\d{15,20}$/.test(String(value || '').trim());

const escapeCsv = (value) => {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const readMaybe = async (file, fallback) => {
  try {
    return await fs.readFile(file, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
};

const parseSteamIds = (raw) => String(raw || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

async function ensureStorage() {
  await fs.mkdir(config.dataDir, { recursive: true });
}

async function record({
  name, discordId, steamId, userId, username, guildId,
}) {
  return withLock(async () => {
    await ensureStorage();
    const at = new Date().toISOString();

    // 1) steamids.txt - comma separated list (เฉพาะ SteamID ตามที่ต้องการ)
    const raw = await readMaybe(FILES.steam, '');
    const steamIds = parseSteamIds(raw);
    steamIds.push(steamId);
    await fs.writeFile(FILES.steam, `${steamIds.join(', ')}\n`, 'utf8');

    // 2) verifications.csv - Name / DiscordID / SteamID
    const csv = await readMaybe(FILES.csv, '');
    if (!csv) {
      await fs.writeFile(FILES.csv, 'timestamp,name,discord_id,steam_id,discord_user_id\n', 'utf8');
    }
    const row = [
      at,
      escapeCsv(name),
      escapeCsv(discordId),
      escapeCsv(steamId),
      escapeCsv(userId),
    ].join(',');
    await fs.appendFile(FILES.csv, `${row}\n`, 'utf8');

    // 3) verifications.json - structured records
    let records = [];
    const json = await readMaybe(FILES.json, '');
    if (json) {
      try { records = JSON.parse(json); } catch { records = []; }
    }
    const entry = {
      id: records.length + 1,
      at,
      name,
      discordId,
      steamId,
      discordUserId: userId || null,
      discordUsername: username || null,
      guildId: guildId || null,
    };
    records.push(entry);
    await fs.writeFile(FILES.json, `${JSON.stringify(records, null, 2)}\n`, 'utf8');

    return {
      entry,
      total: steamIds.length,
      unique: new Set(steamIds).size,
      steamIds,
    };
  });
}

async function stats() {
  await ensureStorage();
  const [steamRaw, json] = await Promise.all([
    readMaybe(FILES.steam, ''),
    readMaybe(FILES.json, ''),
  ]);
  const steamIds = parseSteamIds(steamRaw);
  let records = [];
  try { records = json ? JSON.parse(json) : []; } catch { records = []; }
  return {
    total: steamIds.length,
    unique: new Set(steamIds).size,
    records,
    lastRecords: records.slice(-10).reverse(),
  };
}

function attachmentFiles() {
  return [
    { attachment: FILES.steam, name: 'steamids.txt' },
    { attachment: FILES.csv, name: 'verifications.csv' },
    { attachment: FILES.json, name: 'verifications.json' },
  ];
}

module.exports = {
  FILES,
  ensureStorage,
  record,
  stats,
  attachmentFiles,
  isValidSteamId,
  isValidDiscordId,
};
