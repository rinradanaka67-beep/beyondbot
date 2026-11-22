'use strict';
/** HSHO DISCORD VERIFY BOT BY NONGCHE - อัปเดตข้อความ panel ให้ตรงกับ flow อนุมัติ */
const fs = require('node:fs/promises');
const path = require('node:path');
const { Client, GatewayIntentBits } = require('discord.js');
const { config } = require('../src/config');
const { buildPanel } = require('../src/ui/panel');

const envPath = path.join(__dirname, '..', '.env');
const MESSAGE_ID = '1573911273505300585';
const DESCRIPTION = 'กดปุ่ม **Verify** ด้านล่าง แล้วกรอก **Name / DiscordID / SteamID**\\nข้อมูลจะถูกส่งให้แอดมิน **อนุมัติ/ปฏิเสธ** ก่อนบันทึกไฟล์';

async function main() {
  let content = await fs.readFile(envPath, 'utf8');
  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  const lines = content.split(/\r?\n/);
  const idx = lines.findIndex((line) => /^PANEL_DESCRIPTION\s*=/i.test(line));
  if (idx === -1) lines.push(`PANEL_DESCRIPTION=${DESCRIPTION}`);
  else lines[idx] = `PANEL_DESCRIPTION=${DESCRIPTION}`;
  await fs.writeFile(envPath, lines.join(eol), 'utf8');

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  try {
    await client.login(config.token);
    const channel = await client.channels.fetch(config.verifyChannelId);
    const message = await channel.messages.fetch(MESSAGE_ID);
    const panel = buildPanel();
    panel.embeds[0].setDescription(DESCRIPTION.replace(/\\n/g, '\n'));
    await message.edit(panel);
    console.log('[OK] อัปเดตข้อความ panel ใน Discord แล้ว');
  } finally {
    client.destroy();
  }
}

main().catch((error) => {
  console.error('[FATAL]', error.message);
  process.exit(1);
});
