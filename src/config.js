'use strict';
/**
 * ============================================================
 * HSHO DISCORD VERIFY BOT BY NONGCHE
 * Configuration - all values come from .env
 * ============================================================
 */
const path = require('node:path');
require('dotenv').config({ path: process.env.DOTENV_CONFIG_PATH || path.join(__dirname, '..', '.env') });

const clean = (value, fallback = '') => {
  if (value === undefined || value === null) return fallback;
  return String(value).trim().replace(/\\n/g, '\n');
};

const config = Object.freeze({
  author: 'BY NONGCHE',
  token: clean(process.env.DISCORD_TOKEN),
  clientId: clean(process.env.CLIENT_ID),
  guildId: clean(process.env.GUILD_ID),
  verifyRoleId: clean(process.env.VERIFY_ROLE_ID),
  verifyChannelId: clean(process.env.VERIFY_CHANNEL_ID),
  logChannelId: clean(process.env.LOG_CHANNEL_ID),
  approvalChannelId: clean(process.env.APPROVAL_CHANNEL_ID),
  googleSheetsUrl: clean(process.env.GOOGLE_SHEETS_URL),
  googleSheetsSecret: clean(process.env.GOOGLE_SHEETS_SECRET),
  dataDir: path.resolve(__dirname, '..', clean(process.env.DATA_DIR, 'data')),
  panelTitle: clean(process.env.PANEL_TITLE, '✅ Verify SteamID'),
  panelDescription: clean(
    process.env.PANEL_DESCRIPTION,
    'กดปุ่ม **Verify** ด้านล่าง แล้วกรอกชื่อ Discord และ SteamID ของคุณ',
  ),
});

module.exports = { config };
