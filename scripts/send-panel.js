'use strict';
/**
 * HSHO DISCORD VERIFY BOT BY NONGCHE
 * ส่ง panel ปุ่ม Verify ไปยัง VERIFY_CHANNEL_ID โดยอัตโนมัติ (ไม่ต้องพิมพ์ /setup เอง)
 */
const { Client, GatewayIntentBits } = require('discord.js');
const { config } = require('../src/config');
const { buildPanel } = require('../src/ui/panel');

async function main() {
  if (!config.verifyChannelId) {
    console.error('[FATAL] ยังไม่ได้ตั้ง VERIFY_CHANNEL_ID ใน .env');
    process.exit(1);
  }
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  try {
    await client.login(config.token);
    const channel = await client.channels.fetch(config.verifyChannelId);
    if (!channel?.isTextBased?.()) throw new Error('ช่องที่ระบุไม่ใช่ช่องข้อความ');
    const message = await channel.send(buildPanel());
    console.log(`[OK] ส่ง panel Verify แล้วใน #${channel.name} (message ${message.id})`);
  } finally {
    client.destroy();
  }
}

main().catch((error) => {
  console.error('[FATAL]', error.message);
  process.exit(1);
});
